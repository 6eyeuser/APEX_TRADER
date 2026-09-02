import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";
import { recordJournalEntry } from "@/lib/ledger";

async function getUserId() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "apex_trader_super_secret_key_2026");
  const { payload } = await jose.jwtVerify(token, secret);
  return payload.userId as string;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ code: "AUTH_FAILED" }, { status: 401 });

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ code: "AUTH_FAILED" }, { status: 401 });

    const { symbol, side, type, shares, targetPrice } = await req.json();

    const parsedShares = Number(shares);
    const parsedTarget = Number(targetPrice);

    if (!symbol || !side || !type || parsedShares <= 0 || parsedTarget <= 0) {
      return NextResponse.json({ error: "Invalid order parameters" }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { positions: true }
      });

      if (!user) throw new Error("User not found");

      if (side === "BUY") {
        const requiredCash = parsedShares * parsedTarget;
        if (user.balance < requiredCash) {
          throw new Error(`Insufficient purchasing power. Required collateral: $${requiredCash.toFixed(2)}`);
        }

        // Double-Entry Ledger: Escrow Lock
        await recordJournalEntry(tx, {
          type: "ORDER_ESCROW",
          description: `Escrow lock for BUY ${parsedShares} ${symbol}`,
          lines: [
            { userId: userId, accountId: "USER_CASH", direction: "DEBIT", amount: requiredCash },
            { userId: userId, accountId: "USER_ESCROW", direction: "CREDIT", amount: requiredCash }
          ]
        });
      } else if (side === "SELL") {
        const pos = user.positions.find((p) => p.symbol === symbol);
        if (!pos || pos.shares < parsedShares) {
          throw new Error(`Insufficient ${symbol} shares to lock for sell order.`);
        }
        await tx.position.update({
          where: { id: pos.id },
          data: { shares: { decrement: parsedShares } }
        });
      }

      return await tx.order.create({
        data: {
          userId,
          symbol,
          side,
          type,
          shares: parsedShares,
          targetPrice: parsedTarget,
          status: "PENDING"
        }
      });
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Order placement failed" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ code: "AUTH_FAILED" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");

    if (!orderId) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId }
      });

      if (!order || order.status !== "PENDING") {
        throw new Error("Order cannot be cancelled (not found or already processed)");
      }

      if (order.side === "BUY") {
        const refundAmount = order.shares * order.targetPrice;
        
        // Double-Entry Ledger: Escrow Refund
        await recordJournalEntry(tx, {
          type: "ESCROW_REFUND",
          referenceId: order.id,
          description: `Refund escrow for cancelled order ${order.id}`,
          lines: [
            { userId: userId, accountId: "USER_ESCROW", direction: "DEBIT", amount: refundAmount },
            { userId: userId, accountId: "USER_CASH", direction: "CREDIT", amount: refundAmount }
          ]
        });
      } else if (order.side === "SELL") {
        const pos = await tx.position.findFirst({
          where: { userId, symbol: order.symbol }
        });

        if (pos) {
          await tx.position.update({
            where: { id: pos.id },
            data: { shares: { increment: order.shares } }
          });
        } else {
          await tx.position.create({
            data: {
              userId,
              symbol: order.symbol,
              shares: order.shares,
              averagePrice: order.targetPrice
            }
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" }
      });
    });

    return NextResponse.json({ success: true, message: "Order cancelled and escrow refunded" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Cancellation failed" }, { status: 400 });
  }
}