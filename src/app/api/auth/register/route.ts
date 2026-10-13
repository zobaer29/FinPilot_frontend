import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, setSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { name, email, password, confirmPassword } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        onboardingCompleted: false,
      },
    });

    // Auto-create default sandbox accounts for the user
    await prisma.sandboxAccount.createMany({
      data: [
        { userId: newUser.id, name: "Available Balance", balance: 0, type: "CHECKING" },
        { userId: newUser.id, name: "General Savings", balance: 0, type: "SAVINGS" },
        { userId: newUser.id, name: "Emergency Fund", balance: 0, type: "EMERGENCY" },
        { userId: newUser.id, name: "Goal Fund", balance: 0, type: "GOAL" },
      ],
    });

    await setSessionUser({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
      redirectTo: "/onboarding",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
