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
      console.log("=================================");
      console.log("GOOGLE SIGN-IN START");
      console.log("Provider:", account?.provider);
      console.log("Email:", user.email);
      console.log("=================================");

      // Only allow Google
      if (account?.provider !== "google") {
        console.error("Google sign-in rejected: invalid provider");
        return false;
      }

      // Google must provide an email
      if (!user.email) {
        console.error("Google sign-in rejected: no email");
        return false;
      }

      try {
        const email = user.email.toLowerCase().trim();

        // -----------------------------------------
        // FIND USER
        // -----------------------------------------

        let dbUser = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        // -----------------------------------------
        // CREATE USER IF NOT FOUND
        // -----------------------------------------

        if (!dbUser) {
          console.log("User not found. Creating new user...");

          dbUser = await prisma.user.create({
            data: {
              name: user.name || "Google Trader",
              email,
              password: `oauth_${crypto.randomUUID()}`,
              balance: 100000,
            },
          });

          console.log("Created Google user:", dbUser.id);
        } else {
          console.log("Existing user:", dbUser.id);
        }

        // -----------------------------------------
        // JWT SECRET
        // -----------------------------------------

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
          throw new Error(
            "JWT_SECRET is missing from environment variables"
          );
        }

        // -----------------------------------------
        // CREATE APEXTRADER JWT
        // -----------------------------------------

        const secret = new TextEncoder().encode(jwtSecret);

        const apexToken = await new jose.SignJWT({
          userId: String(dbUser.id),
          email: dbUser.email,
          name: dbUser.name,
        })
          .setProtectedHeader({
            alg: "HS256",
          })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(secret);

        // Store ApexTrader token on NextAuth user
        user.apexToken = apexToken;

        console.log("=================================");
        console.log("GOOGLE LOGIN SUCCESS");
        console.log("Email:", email);
        console.log("Database ID:", dbUser.id);
        console.log("APEX JWT CREATED");
        console.log("=================================");

        return true;
      } catch (error) {
        console.error("=================================");
        console.error("GOOGLE SIGN-IN FAILED");
        console.error(error);
        console.error("=================================");

        // DO NOT silently convert the real error
        // into a useless AccessDenied message.
        throw error;
      }
    },

    // -----------------------------------------
    // NEXTAUTH JWT
    // -----------------------------------------

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = String(user.id);
      }

      if (user?.apexToken) {
        token.apexToken = user.apexToken;
      }

      return token;
    },

    // -----------------------------------------
    // NEXTAUTH SESSION
    // -----------------------------------------

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

  debug: true,
};