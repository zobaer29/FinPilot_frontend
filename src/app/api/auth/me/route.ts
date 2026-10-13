import { NextResponse } from "next/server";
import { getSessionUser, clearSession } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true, redirectTo: "/login" });
}
