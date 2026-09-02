import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jose.decodeJwt(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userEmail = decoded?.email || decoded?.sub;
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await (prisma.user as any).update({
      where: { email: userEmail },
      data: { telegramLinkCode: code }
    });

    return NextResponse.json({ success: true, code });
    
  } catch (error: any) {
    console.error("Telegram Code Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}