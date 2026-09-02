import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { 
        positions: true,
        trades: { 
          orderBy: { createdAt: 'desc' },
          take: 50 
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found", code: "AUTH_FAILED" }, { status: 404 });
    }

    // Format trades for the frontend
    const formattedTrades = user.trades.map(trade => ({
      id: trade.id,
      timestamp: new Date(trade.createdAt).getTime(),
      symbol: trade.symbol,
      action: trade.action,
      shares: trade.shares,
      price: trade.price,
      total: trade.total
    }));

    return NextResponse.json({
      success: true,
      name: user.name,
      balance: user.balance,
      positions: user.positions,
      tradeHistory: formattedTrades // Sent to frontend correctly
    });

  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: "Database error", code: "AUTH_FAILED" }, { status: 500 });
  }
}