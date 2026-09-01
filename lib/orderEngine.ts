// lib/orderEngine.ts
import { prisma } from "@/lib/prisma";
import { recordJournalEntry } from "@/lib/ledger";

export async function evaluateOrderBook(symbol: string, currentPrice: number) {
  if (!symbol || currentPrice <= 0) return;

  const pendingOrders = await prisma.order.findMany({
    where: {
      symbol,
      status: "PENDING"
    }
  });

  if (pendingOrders.length === 0) return;

  for (const order of pendingOrders) {
    let isTriggered = false;

    if (order.type === "LIMIT") {
      if (order.side === "BUY" && currentPrice <= order.targetPrice) isTriggered = true;
      if (order.side === "SELL" && currentPrice >= order.targetPrice) isTriggered = true;
    } else if (order.type === "STOP_LOSS") {
      if (order.side === "SELL" && currentPrice <= order.targetPrice) isTriggered = true;
    } else if (order.type === "TAKE_PROFIT") {
      if (order.side === "SELL" && currentPrice >= order.targetPrice) isTriggered = true;
    }

    if (isTriggered) {
      await fillOrder(order, currentPrice);
    }
  }
}

async function fillOrder(order: any, executionPrice: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id }
      });

      if (!currentOrder || currentOrder.status !== "PENDING") return;

      const totalCost = order.shares * executionPrice;

      if (order.side === "BUY") {
        const escrowedAmount = order.shares * order.targetPrice;
        const refund = escrowedAmount - totalCost;

        // Double-Entry Ledger: Fill Trade & Refund difference
        const lines: any[] = [
          { userId: order.userId, accountId: "USER_ESCROW", direction: "DEBIT", amount: escrowedAmount },
          { userId: null, accountId: "SYSTEM_CLEARING", direction: "CREDIT", amount: totalCost }
        ];
        
        if (refund > 0) {
          lines.push({ userId: order.userId, accountId: "USER_CASH", direction: "CREDIT", amount: refund });
        }

        await recordJournalEntry(tx, {
          type: "TRADE",
          referenceId: order.id,
          description: `Filled BUY ${order.shares} ${order.symbol} @ $${executionPrice}`,
          lines
        });

        // Add shares to position
        const existingPosition = await tx.position.findFirst({
          where: { userId: order.userId, symbol: order.symbol }
        });

        if (existingPosition) {
          const newShares = existingPosition.shares + order.shares;
          const newAvg = ((existingPosition.shares * existingPosition.averagePrice) + totalCost) / newShares;
          await tx.position.update({
            where: { id: existingPosition.id },
            data: { shares: newShares, averagePrice: newAvg }
          });
        } else {
          await tx.position.create({
            data: {
              userId: order.userId,
              symbol: order.symbol,
              shares: order.shares,
              averagePrice: executionPrice
            }
          });
        }
      } else if (order.side === "SELL") {
        // Double-Entry Ledger: Credit cash from selling
        await recordJournalEntry(tx, {
          type: "TRADE",
          referenceId: order.id,
          description: `Filled SELL ${order.shares} ${order.symbol} @ $${executionPrice}`,
          lines: [
            { userId: null, accountId: "SYSTEM_CLEARING", direction: "DEBIT", amount: totalCost },
            { userId: order.userId, accountId: "USER_CASH", direction: "CREDIT", amount: totalCost }
          ]
        });
      }

      // Mark order as FILLED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "FILLED",
          executedPrice: executionPrice,
          totalCost
        }
      });

      // Write trade record history
      await tx.trade.create({
        data: {
          userId: order.userId,
          symbol: order.symbol,
          action: order.side,
          shares: order.shares,
          price: executionPrice,
          total: totalCost
        }
      });
    });

    console.log(`[OrderEngine] Filled ${order.type} ${order.side} for ${order.symbol} @ $${executionPrice}`);
  } catch (error) {
    console.error(`[OrderEngine] Failed to fill order ${order.id}:`, error);
  }
}