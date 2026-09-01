import { withAuth } from "next-auth/middleware";

// This explicitly tells NextAuth to secure these routes using your JWT strategy
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Add every route you want protected to this array
export const config = {
  matcher: [
    "/terminal/:path*",
    "/dashboard/:path*",
    "/trade/:path*",
  ],
};