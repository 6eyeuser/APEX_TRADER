import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  
  session: {
    strategy: "jwt",
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  
  pages: {
    signIn: "/login",
  },
  
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      if (!user.email) {
        console.error("Google did not provide an email.");
        return false;
      }

      try {
        const email = user.email.toLowerCase().trim();

        // Find or create the user in the database
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: user.name || "Google Trader",
              email,
              password: `oauth_${crypto.randomUUID()}`,
              balance: 100000,
            },
          });
        } else if (user.name && dbUser.name !== user.name) {
          // Optional: Update name if it changed
          dbUser = await prisma.user.update({
            where: { email },
            data: { name: user.name },
          });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error("JWT_SECRET is not configured.");
        }

        // Generate your custom ApexTrader Token
        const apexToken = await new jose.SignJWT({
          userId: String(dbUser.id),
          email: dbUser.email,
          name: dbUser.name,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(new TextEncoder().encode(jwtSecret));

        // Attach to the NextAuth user object so JWT callback can read it
        user.id = dbUser.id;
        user.apexToken = apexToken;

        return true;
      } catch (error) {
        console.error("Google authentication failed:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      // User is only passed in on the initial sign-in
      if (user) {
        token.userId = String(user.id);
        if (user.apexToken) {
          token.apexToken = String(user.apexToken);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.userId) {
          session.user.id = String(token.userId);
        }
        if (token.apexToken) {
          session.user.apexToken = String(token.apexToken);
        }
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === "development",
};