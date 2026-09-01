
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "apex_trader_super_secret_key_2026");
    const { payload } = await jose.jwtVerify(token, secret);

    
    const requestingUser = await prisma.user.findUnique({ where: { id: payload.userId as string } });
    if (!requestingUser || requestingUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        role: true,
        createdAt: true,
        _count: { select: { trades: true, orders: true } },
        positions: true,
        orders: { 
          where: { status: "PENDING" },
          orderBy: { createdAt: 'desc' }
        },
        ledgerLines: { 
          orderBy: { createdAt: 'desc' }, 
          take: 15,
          include: { journalEntry: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}