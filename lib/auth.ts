import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
};

export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "apex_trader_super_secret_key_2026"
    );

    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId || !payload.email) {
      return null;
    }

    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: String(payload.name || ""),
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}