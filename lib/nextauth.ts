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

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

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

        const dbUser = await prisma.user.upsert({
          where: {
            email,
          },

          update: {
            name: user.name || undefined,
          },

          create: {
            name: user.name || "Google Trader",
            email,
            password: `oauth_${crypto.randomUUID()}`,
            balance: 100000,
          },
        });

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
          throw new Error("JWT_SECRET is not configured.");
        }

        const apexToken = await new jose.SignJWT({
          userId: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
        })
          .setProtectedHeader({
            alg: "HS256",
          })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(new TextEncoder().encode(jwtSecret));

        user.id = dbUser.id;
        user.apexToken = apexToken;

        console.log("Google authentication successful");
        console.log("ApexTrader user:", dbUser.id);

        return true;
      } catch (error) {
        console.error("Google authentication failed:");
        console.error(error);

        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        if (user.id) {
          token.userId = String(user.id);
        }

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