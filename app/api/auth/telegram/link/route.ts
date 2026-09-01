
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function POST() {
  try {
    
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "apex_trader_super_secret_key_2026");
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.userId as string;

    if (!userId) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    
    await prisma.user.update({
      where: { id: userId },
      data: { telegramLinkCode: code },
    });

    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error("Secure Link Gen Error:", error);
    return NextResponse.json({ error: "Server error or expired session." }, { status: 500 });
  }
}