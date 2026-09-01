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

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is missing.");
      return null;
    }

    const secret = new TextEncoder().encode(jwtSecret);

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