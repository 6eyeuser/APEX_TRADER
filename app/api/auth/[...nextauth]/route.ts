import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      try {
        if (!user.email) {
          console.error("Google did not provide an email.");
          return false;
        }

        const email = user.email.toLowerCase().trim();

        // Find existing ApexTrader user
        let dbUser = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        // Create ApexTrader account for first-time Google users
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: user.name || "Google Trader",
              email,
              password: "oauth_dummy_" + crypto.randomUUID(),
              balance: 100000,
            },
          });

          console.log("Created new Google user:", email);
        }

        // ----------------------------------------------------
        // CREATE THE JWT USED BY THE EXISTING APEXTRADER APP
        // ----------------------------------------------------

        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || "apex_trader_super_secret_key_2026"
        );

        const token = await new jose.SignJWT({
          userId: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
        })
          .setProtectedHeader({
            alg: "HS256",
          })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(secret);

        // ----------------------------------------------------
        // IMPORTANT:
        //
        // httpOnly MUST BE FALSE.
        //
        // Your existing terminal/page.tsx uses:
        //
        // Cookies.get("token")
        //
        // Therefore the browser JavaScript MUST be able
        // to read this cookie.
        // ----------------------------------------------------

        cookies().set("token", token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        console.log("====================================");
        console.log("GOOGLE LOGIN SUCCESS");
        console.log("User:", email);
        console.log("Database ID:", dbUser.id);
        console.log("Token cookie created");
        console.log("====================================");

        return true;
      } catch (error) {
        console.error("Google login error:", error);
        return false;
      }
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };