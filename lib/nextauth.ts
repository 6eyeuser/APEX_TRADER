import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

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

        let dbUser = await prisma.user.findUnique({
          where: {
            email,
          },
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

          console.log("Created Google user:", email);
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
          console.error("JWT_SECRET is missing.");
          return false;
        }

        const secret = new TextEncoder().encode(jwtSecret);

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
          .sign(secret);

        user.apexToken = apexToken;

        console.log("---------------------------------");
        console.log("GOOGLE LOGIN SUCCESS");
        console.log("Email:", email);
        console.log("ApexTrader user ID:", dbUser.id);
        console.log("ApexTrader JWT generated");
        console.log("---------------------------------");

        return true;
      } catch (error) {
        console.error("Google sign-in error:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      if (user?.apexToken) {
        token.apexToken = user.apexToken;
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

  pages: {
    signIn: "/login",
  },

  debug: process.env.NODE_ENV === "development",
};