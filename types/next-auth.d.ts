import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
    apexToken?: string;
  }

  interface Session {
    user: {
      id: string;
      apexToken?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    apexToken?: string;
  }
}