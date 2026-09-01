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
        console.error("GOOGLE AUTH ERROR: No email returned");
        return false;
      }

      try {
        const email = user.email.toLowerCase().trim();

        console.log("GOOGLE AUTH: Looking up user:", email);

        /*
         * IMPORTANT:
         * Use findFirst instead of findUnique.
         *
         * This works even if your Prisma schema currently
         * does not have @unique on User.email.
         */
        let dbUser = await prisma.user.findFirst({
          where: {
            email,
          },
        });

        console.log(
          "GOOGLE AUTH: Existing user:",
          dbUser ? dbUser.id : "NONE"
        );

        /*
         * Create the user if they don't exist.
         */
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: user.name || "Google Trader",
              email,
              password: `oauth_${crypto.randomUUID()}`,
              balance: 100000,
            },
          });

          console.log(
            "GOOGLE AUTH: Created database user:",
            dbUser.id
          );
        }

        /*
         * Make sure JWT_SECRET exists.
         */
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
          console.error(
            "GOOGLE AUTH ERROR: JWT_SECRET is missing"
          );
          return false;
        }

        /*
         * Generate ApexTrader's own JWT.
         */
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

        /*
         * IMPORTANT:
         * Override NextAuth's user.id with YOUR database ID.
         *
         * Otherwise user.id can remain Google's ID.
         */
        user.id = String(dbUser.id);

        /*
         * Store ApexTrader JWT on the NextAuth user.
         */
        user.apexToken = apexToken;

        console.log("--------------------------------");
        console.log("GOOGLE LOGIN SUCCESS");
        console.log("Email:", dbUser.email);
        console.log("Database ID:", dbUser.id);
        console.log("Apex JWT generated");
        console.log("--------------------------------");

        return true;
      } catch (error) {
        console.error("--------------------------------");
        console.error("GOOGLE LOGIN / PRISMA ERROR");
        console.error(error);
        console.error("--------------------------------");

        return false;
      }
    },

    async jwt({ token, user }) {
      /*
       * First login.
       */
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

  debug: true,
};