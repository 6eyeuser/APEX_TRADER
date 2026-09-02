import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = "force-dynamic";

// DUAL-AUTH HELPER
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

export async function POST() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate ALPHANUMERIC code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Save to database
    await prisma.user.update({
      where: { id: userId },
      data: { telegramLinkCode: code }
    });

    return NextResponse.json({ success: true, code });
    
  } catch (error: any) {
    console.error("Telegram Code Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}