import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (dbUser) return String(dbUser.id);
  }

  const token = cookies().get("token")?.value;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "apex_trader_super_secret_key_2026");
      const { payload } = await jose.jwtVerify(token, secret);
      return payload.userId as string;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ code: "AUTH_FAILED", error: "Unauthorized" }, { status: 401 });
    }

    // FIX: Added 'trades' to the database query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        positions: true,
        trades: {
          orderBy: { createdAt: 'desc' } // This ensures your newest trades show at the top of the ledger
        }
      }
    });

    if (!user) {
      return NextResponse.json({ code: "AUTH_FAILED", error: "Unauthorized" }, { status: 401 });
    }

    // FIX: Added 'trades' to the data being sent to the frontend
    return NextResponse.json({ 
      success: true, 
      balance: user.balance, 
      positions: user.positions,
      trades: user.trades,
      name: user.name,
      email: user.email
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}