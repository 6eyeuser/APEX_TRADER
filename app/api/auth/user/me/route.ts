import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { getToken } from "next-auth/jwt";

async function getUserId(req: NextRequest) {
  // 1. NextAuth Token (Google)
  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (nextAuthToken?.userId) return nextAuthToken.userId as string;

  // 2. Legacy Token (Custom)
  const token = req.cookies.get("token")?.value;
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

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    
    if (!userId) {
      return NextResponse.json({ code: "AUTH_FAILED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        positions: true,
      }
    });

    if (!user) {
      return NextResponse.json({ code: "AUTH_FAILED" }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      balance: user.balance, 
      positions: user.positions,
      name: user.name,
      email: user.email
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}