import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const CRYPTO_LIST = new Set(["BTC", "ETH", "SOL", "AVAX", "BNB", "DOGE", "XRP", "ADA", "LINK", "MATIC", "DOT", "NEAR"]);

// ==========================================
// 1. Symbol Sanitization & Market Hours
// ==========================================
function cleanSymbol(raw: string): { baseSymbol: string; dbSymbol: string; isCrypto: boolean } {
  let clean = raw.toUpperCase().trim().replace(/[^A-Z0-9/]/g, "");
  
  if (clean.endsWith("/USD") || clean.endsWith("/USDT")) {
    clean = clean.replace(/\/USD(T)?$/, "");
  } else if (clean.endsWith("USD") || clean.endsWith("USDT")) {
    clean = clean.replace(/USD(T)?$/, "");
  }
  
  clean = clean.replace(/[^A-Z0-9]/g, "");

  const isCrypto = CRYPTO_LIST.has(clean);
  return {
    baseSymbol: clean,
    dbSymbol: isCrypto ? `${clean}/USD` : clean,
    isCrypto,
  };
}

function checkMarketHours(isCrypto: boolean, symbol: string): void {
  if (isCrypto) return; 

  const estString = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const estDate = new Date(estString);
  const day = estDate.getDay(); 
  const minutes = estDate.getHours() * 60 + estDate.getMinutes();

  if (day === 0 || day === 6) {
    throw new Error(`Market is currently CLOSED for ${symbol} (Weekend). US Equities trade Mon-Fri, 9:30 AM - 4:00 PM EST.`);
  }
  if (minutes < 570 || minutes > 960) {
    throw new Error(`Market is currently CLOSED for ${symbol}. Regular trading hours are 9:30 AM - 4:00 PM EST.`);
  }
}

// ==========================================
// 2. Real-Time Price Fetching
// ==========================================
async function fetchLivePrice(rawSymbol: string): Promise<number> {
  const { baseSymbol, isCrypto } = cleanSymbol(rawSymbol);

  if (isCrypto) {
    try {
      const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${baseSymbol}USDT`, { cache: "no-store" });
      if (binanceRes.ok) {
        const data = await binanceRes.json();
        const p = parseFloat(data.price);
        if (!isNaN(p) && p > 0) return Number(p.toFixed(2));
      }
    } catch {}

    try {
      const cbRes = await fetch(`https://api.coinbase.com/v2/prices/${baseSymbol}-USD/spot`, { cache: "no-store" });
      if (cbRes.ok) {
        const data = await cbRes.json();
        const p = parseFloat(data?.data?.amount);
        if (!isNaN(p) && p > 0) return Number(p.toFixed(2));
      }
    } catch {}
  } else {
    try {
      const yfRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${baseSymbol}?interval=1m`, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (yfRes.ok) {
        const data = await yfRes.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price === "number" && price > 0) return Number(price.toFixed(2));
      }
    } catch {}
  }

  throw new Error(`Unable to fetch real-time market price for '${baseSymbol}'. Verify the ticker symbol.`);
}

// ==========================================
// 3. Database Order Execution
// ==========================================
async function executeOrder(userId: string, action: "BUY" | "SELL", rawSymbol: string, requestedShares: number) {
  if (isNaN(requestedShares) || requestedShares === 0) {
    throw new Error("Invalid order quantity.");
  }

  const { baseSymbol, dbSymbol, isCrypto } = cleanSymbol(rawSymbol);
  checkMarketHours(isCrypto, baseSymbol);

  const executionPrice = await fetchLivePrice(baseSymbol);
  
  let actualShares = requestedShares;
  let totalCost = 0;
  let finalBalance = 0;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User record not found.");

    const existingPos = await tx.position.findFirst({
      where: {
        userId: user.id,
        symbol: { in: [dbSymbol, baseSymbol, `${baseSymbol}/USD`] }
      }
    });

    const targetSymbol = existingPos ? existingPos.symbol : dbSymbol;

    if (action === "BUY") {
      if (requestedShares === -1) {
        const safeBalance = Math.max(0, user.balance - 0.02);
        actualShares = Math.floor((safeBalance / executionPrice) * 100000) / 100000;
        if (actualShares <= 0) throw new Error("Insufficient funds to execute a buy.");
      }

      totalCost = Math.floor(actualShares * executionPrice * 100) / 100;

      if (user.balance < totalCost) {
        throw new Error(`Insufficient funds. Required: $${totalCost}, Available: $${user.balance}`);
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: totalCost } }
      });
      finalBalance = updatedUser.balance;

      if (existingPos) {
        const newTotalCost = (existingPos.shares * existingPos.averagePrice) + totalCost;
        const newShares = existingPos.shares + actualShares;
        await tx.position.update({
          where: { id: existingPos.id },
          data: {
            shares: newShares,
            averagePrice: Math.floor((newTotalCost / newShares) * 100) / 100
          }
        });
      } else {
        await tx.position.create({
          data: { userId: user.id, symbol: targetSymbol, shares: actualShares, averagePrice: executionPrice }
        });
      }
    } else {
      if (requestedShares === -1) {
        if (!existingPos || existingPos.shares <= 0) {
          throw new Error(`You do not hold any position in ${targetSymbol} to sell.`);
        }
        actualShares = existingPos.shares;
      }

      totalCost = Math.floor(actualShares * executionPrice * 100) / 100;

      if (!existingPos || existingPos.shares < actualShares) {
        throw new Error(`Insufficient holdings. You hold ${existingPos?.shares || 0} units of ${targetSymbol}, but tried to sell ${actualShares}.`);
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: totalCost } }
      });
      finalBalance = updatedUser.balance;

      if (existingPos.shares === actualShares) {
        await tx.position.delete({ where: { id: existingPos.id } });
      } else {
        await tx.position.update({
          where: { id: existingPos.id },
          data: { shares: { decrement: actualShares } }
        });
      }
    }

    await tx.trade.create({
      data: { userId: user.id, action, symbol: targetSymbol, shares: actualShares, price: executionPrice, total: totalCost }
    });
  });

  return {
    success: true, action, symbol: dbSymbol, shares: actualShares, executionPrice, totalCost, newBalance: finalBalance
  };
}

// ==========================================
// 4. Main API Route
// ==========================================
export async function POST(req: Request) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try {
      decoded = jose.decodeJwt(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userEmail = decoded?.email || decoded?.sub;
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { positions: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { messages } = await req.json();

    const portfolioContext = `
Available Cash: $${user.balance.toFixed(2)}
Holdings: ${user.positions.length > 0 ? user.positions.map((p) => `${p.shares} units of ${p.symbol} (avg: $${p.averagePrice})`).join(", ") : "None"}
`;
    
    const systemMessage = {
      role: "system",
      content: `You are ApexTrader Autonomous Copilot, an institutional execution engine.

CURRENT USER PORTFOLIO:
${portfolioContext}
(Note: You MUST read this portfolio before taking ANY action).

DOMAIN GLOSSARY & SLANG TRANSLATION (CRITICAL):
- "Exit the market" | "Liquidate everything" | "Dump my bags": You must look at the user's CURRENT PORTFOLIO. For EVERY asset they own with shares > 0, you must execute a SELL order with shares = -1 via the batch tool.
- "Sell all X": Pass shares = -1 for asset X.
- "Rebalance" | "Rotate": Sell the specified losing/old assets first, THEN use the new cash balance to buy the requested assets.
- "Save for X" | "Keep enough for X": Fetch the price of X, subtract it from available cash, and ONLY trade with the remainder.

EXECUTION PROTOCOL:
1. If the user asks for multiple actions (e.g., "Sell SOL, buy BTC, buy BNB"), you MUST execute them as an array inside the 'executeBatchTrades' tool. Do not use separate tool calls.
2. NEVER return an empty response. Always explain the actions you took or why you couldn't take them.`
    };

    const tools = [
      {
        type: "function",
        function: {
          name: "executeBatchTrades",
          description: "Executes one or multiple trades sequentially. Use this for single trades, multi-leg orders, or full market liquidations.",
          parameters: {
            type: "object",
            properties: {
              orders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["BUY", "SELL"] },
                    symbol: { type: "string", description: "The ticker symbol (e.g., BTC, SOL, AVAX)" },
                    shares: { type: "number", description: "Quantity to trade. Pass -1 to automatically calculate 100% of available portfolio cash (BUY) or 100% of current holdings (SELL)." }
                  },
                  required: ["action", "symbol", "shares"]
                }
              }
            },
            required: ["orders"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_live_price",
          description: "Fetches live market price for any stock or crypto symbol.",
          parameters: {
            type: "object",
            properties: {
              symbol: { type: "string", description: "Ticker symbol (e.g., BTC, ETH, SOL, TSLA)" }
            },
            required: ["symbol"]
          }
        }
      }
    ];

    let currentMessages = [systemMessage, ...messages];
    const targetModel = "openai/gpt-oss-120b"; 

    // 🧠 DYNAMIC AGENT LOOP
    let isDone = false;
    let loopCount = 0;
    let finalMsg = "";
    let executedTradeDetails: any = null;
    let criticalError: string | null = null;

    while (!isDone && loopCount < 3) {
      loopCount++;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModel,
          messages: currentMessages,
          tools,
          tool_choice: "auto",
          temperature: 0.1
        })
      });

      const groqData = await groqRes.json();
      if (!groqRes.ok) throw new Error(groqData.error?.message || "Groq API error");

      const responseMessage = groqData.choices[0].message;

      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        finalMsg = responseMessage.content;
        isDone = true;
        break;
      }

      currentMessages.push(responseMessage);
      
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "executeBatchTrades") {
          const args = JSON.parse(toolCall.function.arguments);
          const orders = args.orders || [];
          
          // CRITICAL: Sort orders so SELL executes before BUY (Frees up cash first)
          orders.sort((a: any, b: any) => (a.action === "SELL" ? -1 : 1));

          let batchResults = [];
          let batchErrors = [];

          for (const order of orders) {
            try {
              const tradeResult = await executeOrder(user.id, order.action, order.symbol, Number(order.shares));
              batchResults.push(tradeResult);
              executedTradeDetails = tradeResult; // Store the last successful trade for the frontend trigger
            } catch (err: any) {
              batchErrors.push(`[${order.action} ${order.symbol}] Failed: ${err.message}`);
              criticalError = err.message;
            }
          }

          currentMessages.push({
            role: "tool", 
            tool_call_id: toolCall.id, 
            name: "executeBatchTrades",
            content: JSON.stringify({ 
              status: batchErrors.length > 0 ? "PARTIAL_SUCCESS_OR_FAILED" : "SUCCESS", 
              successful_trades: batchResults, 
              errors: batchErrors 
            })
          });

        } else if (toolCall.function.name === "get_live_price") {
          const args = JSON.parse(toolCall.function.arguments);
          try {
            const price = await fetchLivePrice(args.symbol);
            currentMessages.push({
              role: "tool", tool_call_id: toolCall.id, name: "get_live_price",
              content: JSON.stringify({ symbol: args.symbol, price })
            });
          } catch (err: any) {
            currentMessages.push({
              role: "tool", tool_call_id: toolCall.id, name: "get_live_price",
              content: JSON.stringify({ symbol: args.symbol, error: err.message })
            });
          }
        }
      }

      if (criticalError && !executedTradeDetails) {
        return NextResponse.json({
          role: "assistant",
          content: `❌ **Execution Failed:**\n${criticalError}`,
          executedTrade: null
        });
      }
    } 

    return NextResponse.json({
      role: "assistant",
      content: finalMsg || "Command processed.",
      executedTrade: executedTradeDetails
    });

  } catch (error: any) {
    console.error("Copilot Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request." }, { status: 500 });
  }
}