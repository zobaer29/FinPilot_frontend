
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const SESSION_COOKIE_NAME = "finpilot_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  onboardingCompleted: boolean;
  currency: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setSessionUser(user: { id: string; email: string; name?: string | null }) {
  const cookieStore = await cookies();
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name || "User",
  });

  // Base64 encode for simple cookie storage in demo prototype
  const token = Buffer.from(payload).toString("base64");

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as { id: string; email: string; name?: string };

    const dbUser = await prisma.user.findUnique({
      where: { id: parsed.id },
    });

    if (!dbUser) return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      onboardingCompleted: dbUser.onboardingCompleted,
      currency: dbUser.currency,
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
