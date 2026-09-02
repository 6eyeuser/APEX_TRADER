import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const token = cookies().get("token")?.value;
    if (token) {
      return NextResponse.json(
        { error: "You are already logged in. Please log out to create a new account." },
        { status: 403 }
      );
    }

    const { name, email, password, otp } = await req.json();

    if (!name || !email || !password || !otp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const otpRecord = await prisma.otpCode.findUnique({ where: { email } });
    
    if (!otpRecord) {
      return NextResponse.json({ error: "No verification code requested." }, { status: 400 });
    }
    if (otpRecord.code !== otp) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }
    if (otpRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "Verification code expired." }, { status: 400 });
    }

    // 4. Ensure user doesn't already exist
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, balance: 100000.00 }
    });

    await prisma.otpCode.delete({ where: { email } });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-jwt-key');
    const jwtToken = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    cookies().set("token", jwtToken, { httpOnly: false, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}