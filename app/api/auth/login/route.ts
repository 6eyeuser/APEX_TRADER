// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // NEW CHECK: Prevent error if a Google user tries to log in with a password
    if (!user.password) {
      return NextResponse.json({ error: "Please log in using your Google account." }, { status: 401 });
    }

    // TypeScript is now happy because it knows user.password is definitely a string
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-jwt-key');
    const token = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    cookies().set("token", token, { httpOnly: false, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}