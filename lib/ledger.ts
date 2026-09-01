// lib/ledger.ts
import { Prisma } from "@prisma/client";

type LedgerPayload = {
  type: "TRADE" | "DEPOSIT" | "ORDER_ESCROW" | "ESCROW_REFUND";
  referenceId?: string;
  description: string;
  lines: Array<{
    userId: string | null;
    accountId: "USER_CASH" | "USER_ESCROW" | "SYSTEM_CLEARING";
    direction: "DEBIT" | "CREDIT";
    amount: number;
  }>;
};

export async function recordJournalEntry(tx: Prisma.TransactionClient, payload: LedgerPayload) {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of payload.lines) {
    if (line.amount <= 0) throw new Error("Ledger amounts must be strictly positive.");
    if (line.direction === "DEBIT") totalDebits += line.amount;
    if (line.direction === "CREDIT") totalCredits += line.amount;
  }

  if (Math.abs(totalDebits - totalCredits) > 0.0001) {
    throw new Error(`Ledger Imbalance! Debits: $${totalDebits}, Credits: $${totalCredits}`);
  }

  await tx.journalEntry.create({
    data: {
      type: payload.type,
      referenceId: payload.referenceId,
      description: payload.description,
      lines: {
        create: payload.lines.map(line => ({
          userId: line.userId,
          accountId: line.accountId,
          direction: line.direction,
          amount: line.amount
        }))
      }
    }
  });

  // Update Cached User Balances and the Peak Profit High-Water Mark
  for (const line of payload.lines) {
    if (line.userId && line.accountId === "USER_CASH") {
      
      let updatedUser;

      if (line.direction === "CREDIT") {
        updatedUser = await tx.user.update({
          where: { id: line.userId },
          data: { balance: { increment: line.amount } }
        });
      } else if (line.direction === "DEBIT") {
        updatedUser = await tx.user.update({
          where: { id: line.userId },
          data: { balance: { decrement: line.amount } }
        });
      }

      // HIGH-WATER MARK CHECK: If the new balance is their all-time high, record it.
      if (updatedUser && updatedUser.balance > updatedUser.peakBalance) {
        await tx.user.update({
          where: { id: line.userId },
          data: { 
            peakBalance: updatedUser.balance,
            peakBalanceAt: new Date()
          }
        });
      }
    }
  }
}