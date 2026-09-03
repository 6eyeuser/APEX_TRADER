import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ==========================================
// HELPER FUNCTIONS
// ==========================================
async function getLiveMarketPrice(rawSymbol: string, fallbackPrice: number = 0): Promise<number> {
  const base = rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/USD|USDT$/, "");
  try {
    const cbRes = await fetch(`https://api.coinbase.com/v2/prices/${base}-USD/spot`, { cache: "no-store" });
    if (cbRes.ok) {
      const data = await cbRes.json();
      const price = parseFloat(data?.data?.amount);
      if (!isNaN(price) && price > 0) return price;
    }
  } catch (err) {}
  return fallbackPrice;
}

async function sendTelegram(chatId: string, text: string, replyMarkup: any = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  const payload: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function editTelegram(chatId: string, messageId: number, text: string, replyMarkup: any = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  const payload: any = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 1. AUTO-SETUP: VISIT THIS VIA GET TO REGISTER
// ==========================================
export async function GET(req: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN environment variable is missing on Vercel." }, { status: 500 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const webhookUrl = `${proto}://${host}/api/auth/webhook`;

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const tgData = await tgRes.json();

    return NextResponse.json({
      success: true,
      message: "Webhook registered successfully!",
      webhookUrl,
      telegram: tgData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 2. MAIN TELEGRAM WEBHOOK ENGINE (POST)
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ------------------------------------------
    // A. INLINE KEYBOARD ACTIONS (SELL / BUY)
    // ------------------------------------------
    if (body.callback_query) {
      const cb = body.callback_query;
      const chatId = cb.message.chat.id.toString();
      const messageId = cb.message.message_id;
      const data = cb.data;

      const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id }),
      });

      const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
      if (!user) return NextResponse.json({ success: true });

      if (data === "CANCEL") {
        await editTelegram(chatId, messageId, "🛑 <b>Action Cancelled.</b>");
        return NextResponse.json({ success: true });
      }

      if (data.startsWith("SELL_ASSET_")) {
        const symbol = data.replace("SELL_ASSET_", "");
        const pos = await prisma.position.findFirst({ where: { userId: user.id, symbol } });

        if (!pos) {
          await editTelegram(chatId, messageId, `❌ You no longer hold <b>${symbol}</b>.`);
          return NextResponse.json({ success: true });
        }

        const keyboard = {
          inline_keyboard: [
            [
              { text: "Sell 25%", callback_data: `EXEC_${symbol}_25` },
              { text: "Sell 50%", callback_data: `EXEC_${symbol}_50` },
            ],
            [{ text: "Sell ALL (100%)", callback_data: `EXEC_${symbol}_ALL` }],
            [{ text: "⬅️ Cancel", callback_data: "CANCEL" }],
          ],
        };
        await editTelegram(chatId, messageId, `🪙 <b>${symbol}</b>\nShares Owned: <b>${pos.shares}</b>\n\nSelect quantity to liquidate:`, keyboard);
        return NextResponse.json({ success: true });
      }

      if (data.startsWith("EXEC_")) {
        const parts = data.split("_");
        const symbol = parts[1];
        const qtyType = parts[2];

        const pos = await prisma.position.findFirst({ where: { userId: user.id, symbol } });
        if (!pos) return NextResponse.json({ success: true });

        let sharesToSell = 0;
        if (qtyType === "ALL") sharesToSell = pos.shares;
        else if (qtyType === "50") sharesToSell = pos.shares * 0.5;
        else if (qtyType === "25") sharesToSell = pos.shares * 0.25;

        const livePrice = await getLiveMarketPrice(pos.symbol, pos.averagePrice);
        const totalCredit = sharesToSell * livePrice;

        await prisma.$transaction(async (tx) => {
          if (pos.shares === sharesToSell) {
            await tx.position.delete({ where: { id: pos.id } });
          } else {
            await tx.position.update({ where: { id: pos.id }, data: { shares: { decrement: sharesToSell } } });
          }
          await tx.user.update({ where: { id: user.id }, data: { balance: { increment: totalCredit } } });
          await tx.trade.create({
            data: { userId: user.id, action: "SELL", symbol: pos.symbol, shares: sharesToSell, price: livePrice, total: totalCredit },
          });
        });

        const rPrice = livePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const rTotal = totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        await editTelegram(
          chatId,
          messageId,
          `✅ <b>Order Executed via Telegram</b>\n\n• <b>Asset:</b> ${pos.symbol}\n• <b>Sold:</b> ${sharesToSell} shares\n• <b>Fill Price:</b> $${rPrice}\n• <b>Total Credited:</b> +$${rTotal}\n\n<i>💡 Your web dashboard has been updated.</i>`
        );
        return NextResponse.json({ success: true });
      }

      if (data.startsWith("VEXEC_")) {
        const parts = data.split("_");
        const action = parts[1];
        const symbol = parts[2];
        const shares = parseFloat(parts[3]);

        const livePrice = await getLiveMarketPrice(symbol, 150.0);
        const totalValue = livePrice * shares;

        await prisma.$transaction(async (tx) => {
          if (action === "BUY") {
            await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: totalValue } } });

            const existingPos = await tx.position.findFirst({ where: { userId: user.id, symbol } });
            if (existingPos) {
              const newTotalCost = existingPos.shares * existingPos.averagePrice + totalValue;
              const newShares = existingPos.shares + shares;
              await tx.position.update({
                where: { id: existingPos.id },
                data: { shares: newShares, averagePrice: newTotalCost / newShares },
              });
            } else {
              await tx.position.create({
                data: { userId: user.id, symbol, shares, averagePrice: livePrice },
              });
            }
          } else {
            const existingPos = await tx.position.findFirst({ where: { userId: user.id, symbol } });
            if (existingPos) {
              await tx.user.update({ where: { id: user.id }, data: { balance: { increment: totalValue } } });
              if (existingPos.shares <= shares) {
                await tx.position.delete({ where: { id: existingPos.id } });
              } else {
                await tx.position.update({ where: { id: existingPos.id }, data: { shares: { decrement: shares } } });
              }
            }
          }

          await tx.trade.create({
            data: { userId: user.id, action, symbol, shares, price: livePrice, total: totalValue },
          });
        });

        await editTelegram(
          chatId,
          messageId,
          `✅ <b>Voice Order Executed</b>\n\n• <b>Action:</b> ${action}\n• <b>Asset:</b> ${symbol}\n• <b>Shares:</b> ${shares}\n• <b>Fill Price:</b> $${livePrice.toLocaleString()}\n• <b>Total:</b> $${totalValue.toLocaleString()}`
        );
        return NextResponse.json({ success: true });
      }
    }

    // ------------------------------------------
    // B. VOICE TRADING (DEEPGRAM + GROQ)
    // ------------------------------------------
    if (body.message && body.message.voice) {
      const chatId = body.message.chat.id.toString();
      const fileId = body.message.voice.file_id;
      const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

      await sendTelegram(chatId, "🎙️ <i>Transcribing and processing voice command...</i>");

      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result.file_path;

      const audioUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const audioRes = await fetch(audioUrl);
      const audioBuffer = await audioRes.arrayBuffer();

      const dgRes = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY?.trim()}`,
          "Content-Type": "audio/ogg",
        },
        body: Buffer.from(audioBuffer),
      });
      const dgData = await dgRes.json();
      const transcript = dgData.results?.channels[0]?.alternatives[0]?.transcript || "";

      if (!transcript.trim()) {
        await sendTelegram(chatId, "❌ Could not hear audio clearly. Please try again.");
        return NextResponse.json({ success: true });
      }

      const llmPrompt = `
        Extract trading intent from this transcript: "${transcript}"
        Return ONLY valid JSON (no markdown, no backticks):
        {
          "action": "BUY" or "SELL",
          "symbol": "TICKER",
          "shares": number
        }
      `;

      const llmRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY?.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: llmPrompt }],
          temperature: 0,
        }),
      });

      const llmData = await llmRes.json();
      let intent;
      try {
        intent = JSON.parse(llmData.choices[0].message.content.trim().replace(/```json|```/g, ""));
      } catch (e) {
        await sendTelegram(chatId, `❌ Could not parse trade instruction.\n\n<i>Transcript: "${transcript}"</i>`);
        return NextResponse.json({ success: true });
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: `✅ Confirm ${intent.action}`, callback_data: `VEXEC_${intent.action}_${intent.symbol}_${intent.shares}` }],
          [{ text: "⬅️ Cancel", callback_data: "CANCEL" }],
        ]
      };

      const sign = intent.action === "BUY" ? "🟢" : "🔴";
      await sendTelegram(
        chatId,
        `🗣️ <b>Transcript:</b> "${transcript}"\n\n${sign} <b>Proposed Order:</b>\nAction: <b>${intent.action}</b>\nAsset: <b>${intent.symbol}</b>\nShares: <b>${intent.shares}</b>\n\nExecute trade?`,
        keyboard
      );

      return NextResponse.json({ success: true });
    }

    // ------------------------------------------
    // C. TEXT COMMANDS (AUTOMATED 1-CLICK LINKING)
    // ------------------------------------------
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id.toString();
      const telegramUser = body.message.from?.username || body.message.from?.first_name || "Trader";
      const text = body.message.text.trim();
      const parts = text.split(" ");
      const command = parts[0].toUpperCase();

      // AUTOMATED ONE-CLICK DEEP LINK: /start 123456 OR /link 123456
      if ((command === "/START" && parts[1]) || command === "/LINK" || command === "LINK") {
        const linkCode = parts[1];

        const userToLink = await prisma.user.findFirst({
          where: { telegramLinkCode: linkCode },
        });

        if (!userToLink) {
          await sendTelegram(
            chatId,
            "❌ <b>Invalid or Expired Link</b>\n\nPlease return to your web dashboard and click 'Connect Telegram' again."
          );
          return NextResponse.json({ success: true });
        }

       // Unlink any previous account paired to this chat ID
        await prisma.user.updateMany({
          where: { telegramChatId: chatId },
          data: { telegramChatId: null },
        });

        // Link the authenticated account
        await prisma.user.update({
          where: { id: userToLink.id },
          data: {
            telegramChatId: chatId,
            telegramLinkCode: null,
          },
        });

        await sendTelegram(
          chatId,
          `🎉 <b>ApexTrader Account Linked!</b>\n\n` +
          `• <b>Account:</b> ${userToLink.email}\n` +
          `• <b>Balance:</b> $${userToLink.balance.toLocaleString()}\n\n` +
          `You're all set! Use <b>/trade</b> to see your positions or hold down the 🎙️ mic button to trade by voice.`
        );
        return NextResponse.json({ success: true });
      }

      // Check if user is linked for all subsequent commands
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
        include: { positions: true },
      });

      if (!user) {
        await sendTelegram(
          chatId,
          "🔒 <b>Account Not Linked</b>\n\nClick 'Connect Telegram' inside your ApexTrader dashboard to connect automatically with one tap."
        );
        return NextResponse.json({ success: true });
      }

      if (command === "/TRADE" || command === "/PORTFOLIO") {
        if (user.positions.length === 0) {
          await sendTelegram(chatId, "📊 <b>Your Portfolio</b>\n\nYou currently have no open positions.");
          return NextResponse.json({ success: true });
        }

        const buttons = user.positions.map((p) => [
          { text: `${p.symbol} (${p.shares} shrs)`, callback_data: `SELL_ASSET_${p.symbol}` },
        ]);

        const keyboard = { inline_keyboard: buttons };
        await sendTelegram(chatId, "📊 <b>Active Positions</b>\n\nSelect an asset to trade:", keyboard);
        return NextResponse.json({ success: true });
      }

      // Default Help Guide
      await sendTelegram(
        chatId,
        `🤖 <b>ApexTrader Bot Active</b>\n\n` +
        `• <b>/trade</b> - Manage open positions & liquidate.\n` +
        `• <b>Send Voice Note</b> - Speak trade orders (e.g. <i>"Buy 2 BTC"</i>).\n` +
        `• <b>Status:</b> Connected to ${user.email}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram Webhook Execution Error:", error);
    return NextResponse.json({ success: true });
  }
}