import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, setSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await setSessionUser({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const redirectTo = user.onboardingCompleted ? "/dashboard" : "/onboarding";

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: user.onboardingCompleted },
      redirectTo,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
