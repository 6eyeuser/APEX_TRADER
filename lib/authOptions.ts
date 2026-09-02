import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import crypto from "crypto";

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
    async signIn({ user, account, profile }) {
      console.log("--- 1. SIGN-IN CALLBACK TRIGGERED ---");
      console.log("Account Provider:", account?.provider);
      console.log("User Email:", user?.email);

      if (account?.provider !== "google") {
        console.error("FAILED: Provider is not google");
        return false;
      }

      if (!user.email) {
        console.error("FAILED: No email provided by Google");
        return false;
      }

      try {
        const email = user.email.toLowerCase().trim();
        console.log("--- 2. CHECKING PRISMA DATABASE ---");

        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          console.log("--- 3. CREATING NEW USER IN DB ---");
          dbUser = await prisma.user.create({
            data: {
              name: user.name || "Google Trader",
              email,
              password: `oauth_${crypto.randomUUID()}`,
              balance: 100000,
            },
          });
          console.log("Created user ID:", dbUser.id);
        } else {
          console.log("Found existing user ID:", dbUser.id);
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error("CRITICAL: JWT_SECRET is missing from environment variables!");
        }

        console.log("--- 4. SIGNING APEX JWT ---");
        const apexToken = await new jose.SignJWT({
          userId: String(dbUser.id),
          email: dbUser.email,
          name: dbUser.name,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(new TextEncoder().encode(jwtSecret));

        user.id = String(dbUser.id);
        user.apexToken = apexToken;

        console.log("--- 5. SUCCESS! RETURNING TRUE ---");
        return true;
      } catch (error: any) {
        // THIS WILL PRINT THE EXACT DATABASE OR JWT CRASH TO VERCEL LOGS
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("CRASH INSIDE GOOGLE SIGN-IN CALLBACK:", error.message || error);
        console.error(error.stack);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        return false;
      }
    },

    async jwt({ token, user }) {
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

  debug: true,
};