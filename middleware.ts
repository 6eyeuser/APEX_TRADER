import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;

  // Logged-in users should not see login/signup
  if (
    token &&
    (pathname === "/login" || pathname === "/signup")
  ) {
    return NextResponse.redirect(
      new URL("/terminal", request.url)
    );
  }

  // Unauthenticated users cannot access protected pages
  if (
    !token &&
    (
      pathname.startsWith("/terminal") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin")
    )
  ) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/terminal/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};