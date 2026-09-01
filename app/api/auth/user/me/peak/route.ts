import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

async function sendTelegramAlert(chatId: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    console.error("Telegram Alert Failed: Missing Bot Token or Chat ID", { hasToken: !!token, chatId });
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
    
    const data = await res.json();
    if (!data.ok) {
      console.error("Telegram API Error:", data.description);
    } else {
      console.log("Telegram Peak Notification Sent Successfully!");
    }
  } catch (err) {
    console.error("Failed to reach Telegram servers", err);
  }
}

export async function POST(req: Request) {
  try {
    const { peakEquity, report } = await req.json();
    
    if (!peakEquity || typeof peakEquity !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "apex_trader_super_secret_key_2026");
    const { payload } = await jose.jwtVerify(token, secret);

    const user = await prisma.user.findUnique({ where: { id: payload.userId as string } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // FIX: Safely convert Prisma's Decimal/null to a standard JavaScript Number
    const currentPeak = user.peakBalance ? Number(user.peakBalance) : 100000;
    
    console.log(`[Peak Check] -> Target: $${peakEquity} | Current DB Record: $${currentPeak}`);

    // SECURITY CHECK: New High-Water Mark Achieved
    if (peakEquity > currentPeak) {
      console.log("New peak detected! Saving to DB and notifying...");
      
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          peakBalance: peakEquity, 
          peakBalanceAt: new Date() 
        }
      });

      // Fire off the Detailed Telegram Alert if the user has connected their Telegram account
      if (user.telegramChatId) {
        let sheet = `🚀 <b>NEW HIGH-WATER MARK!</b>\n\n`;
        sheet += `🏆 <b>Peak Equity:</b> $${peakEquity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n\n`;
        sheet += `📈 <b>Portfolio Breakdown:</b>\n`;
        
        if (report && report.length > 0) {
          report.forEach((item: any) => {
            const icon = item.pnl >= 0 ? "🟢" : "🔴";
            const sign = item.pnl >= 0 ? "+" : "";
            sheet += `${icon} <b>${item.symbol}</b> | ${item.shares} shrs\n`;
            sheet += `   Price: $${item.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
            sheet += `   PnL: ${sign}$${item.pnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${sign}${item.pnlPct.toFixed(2)}%)\n\n`;
          });
        } else {
          sheet += `<i>Holding 100% Cash</i>\n\n`;
        }
        
        sheet += `<i>Keep up the great trading!</i> 🥂`;

        await sendTelegramAlert(user.telegramChatId, sheet);
      } else {
        console.log("Peak saved, but user has no Telegram Chat ID linked.");
      }

      return NextResponse.json({ success: true, updated: true });
    }

    return NextResponse.json({ success: true, updated: false });
  } catch (error) {
    console.error("Peak Equity Sync Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}