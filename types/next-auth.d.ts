import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      apexToken: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    apexToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    apexToken?: string;
  }
}