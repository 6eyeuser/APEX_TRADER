export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.apexToken) {
      console.error("Google completion failed: no Apex token");

      return NextResponse.redirect(
        new URL("/login?error=GoogleSessionFailed", request.url)
      );
    }

    const response = NextResponse.redirect(
      new URL("/terminal", request.url)
    );

    response.cookies.set("token", session.user.apexToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    console.log("ApexTrader token cookie created");

    return response;
  } catch (error) {
    console.error("Google completion error:", error);

    return NextResponse.redirect(
      new URL("/login?error=GoogleCompletionFailed", request.url)
    );
  }
}