import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// ==========================================
// HELPER: Normalize Symbols & Fetch Live Price
// ==========================================
// Forces known cryptos to always append /USD
function normalizeSymbol(rawSymbol: string): string {
  const symbol = rawSymbol.toUpperCase().trim();
  const cryptos = ["BTC", "ETH", "SOL", "AVAX", "BNB", "DOGE", "XRP", "ADA", "LINK"];
  if (cryptos.includes(symbol)) {
    return `${symbol}/USD`;
  }
  return symbol;
}

async function getLiveAssetPrice(rawSymbol: string): Promise<number> {
  const symbol = rawSymbol.toUpperCase().trim();
  const base = symbol.replace(/[^A-Z0-9]/g, "").replace(/USD|USDT$/, "");

  try {
    const cbRes = await fetch(`https://api.coinbase.com/v2/prices/${base}-USD/spot`, { cache: "no-store" });
    if (cbRes.ok) {
      const data = await cbRes.json();
      const p = parseFloat(data?.data?.amount);
      if (!isNaN(p) && p > 0) return p;
    }
  } catch {}

  const fallbackPrices: Record<string, number> = {
    AMD: 485.0, AAPL: 230.0, TSLA: 345.0, NVDA: 130.0, MSFT: 495.0,
    GOOGL: 342.0, AMZN: 185.0, META: 560.0, BTC: 77800.0, SOL: 95.5,
    AVAX: 7.22, BNB: 695.34,
  };

  return fallbackPrices[symbol] || fallbackPrices[base] || 150.0;
}

// ==========================================
// MAIN POST ROUTE
// ==========================================
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH_FAILED" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jose.decodeJwt(token);
    } catch (e) {
      return NextResponse.json({ error: "Invalid token format", code: "AUTH_FAILED" }, { status: 401 });
    }

    const userEmail = decoded?.email || decoded?.sub;

    if (!userEmail) {
      return NextResponse.json({ error: "Corrupted token missing email", code: "AUTH_FAILED" }, { status: 401 });
    }

    const { action, symbol: rawSymbol, shares, currentPrice } = await req.json();
    
    if (!action || !rawSymbol || shares <= 0) {
      return NextResponse.json({ error: "Invalid trade parameters" }, { status: 400 });
    }

    // Normalize the symbol here before any database lookups
    const symbol = normalizeSymbol(rawSymbol);

    let executionPrice = parseFloat(currentPrice);
    if (isNaN(executionPrice) || executionPrice <= 0) {
      executionPrice = await getLiveAssetPrice(symbol);
    }

    const totalOrderValue = Number((shares * executionPrice).toFixed(2));

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: userEmail } });
      if (!user) throw new Error("User not found");

      const existingPosition = await tx.position.findFirst({
        where: { 
          userId: user.id, 
          symbol: {
            in: [symbol, symbol + "/USD", symbol.replace("/USD", "")]
          }
        }
      });

      const finalSymbol = existingPosition ? existingPosition.symbol : symbol;

      if (action === "BUY") {
        if (user.balance < totalOrderValue) throw new Error("Insufficient buying power");

        await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: totalOrderValue } }
        });

        if (existingPosition) {
          const newShares = existingPosition.shares + shares;
          const totalCost = (existingPosition.shares * existingPosition.averagePrice) + totalOrderValue;
          await tx.position.update({
            where: { id: existingPosition.id },
            data: { shares: newShares, averagePrice: Number((totalCost / newShares).toFixed(2)) }
          });
        } else {
          await tx.position.create({
            data: { userId: user.id, symbol: finalSymbol, shares, averagePrice: executionPrice }
          });
        }
      } 
      
      if (action === "SELL") {
        if (!existingPosition || existingPosition.shares < shares) {
          throw new Error(`Insufficient shares of ${finalSymbol} to sell`);
        }

        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: totalOrderValue } }
        });

        if (existingPosition.shares === shares) {
          await tx.position.delete({ where: { id: existingPosition.id } });
        } else {
          await tx.position.update({
            where: { id: existingPosition.id },
            data: { shares: { decrement: shares } }
          });
        }
      }

      await tx.trade.create({
        data: { userId: user.id, action, symbol: finalSymbol, shares, price: executionPrice, total: totalOrderValue }
      });
    });

    const updatedUser = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { 
        positions: true, 
        trades: { orderBy: { createdAt: 'desc' }, take: 50 } 
      }
    });

    const formattedTrades = updatedUser?.trades.map(trade => ({
      id: trade.id,
      timestamp: new Date(trade.createdAt).getTime(),
      symbol: trade.symbol,
      action: trade.action,
      shares: trade.shares,
      price: trade.price,
      total: trade.total
    })) || [];

    return NextResponse.json({ 
      success: true, 
      balance: updatedUser?.balance, 
      positions: updatedUser?.positions,
      tradeHistory: formattedTrades 
    });

  } catch (error: any) {
    console.error("Trade Execution Error:", error.message);
    return NextResponse.json({ error: error.message || "Trade failed" }, { status: 400 });
  }
}