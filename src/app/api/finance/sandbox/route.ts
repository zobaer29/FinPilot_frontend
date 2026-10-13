import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { fromAccountName, toAccountName, amount, budgetAdjustments } = await request.json();

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { sandboxAccounts: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fromAcc = user.sandboxAccounts.find((a) => a.name === fromAccountName);
    const toAcc = user.sandboxAccounts.find((a) => a.name === toAccountName);

    if (fromAccountName && toAccountName && amount) {
      if (!fromAcc || !toAcc) {
        return NextResponse.json({ error: "One or both accounts not found" }, { status: 400 });
      }

      if (fromAcc.balance < amount) {
        return NextResponse.json({ error: "Insufficient balance in source account" }, { status: 400 });
      }

      // Decrement source and increment target
      await prisma.sandboxAccount.update({
        where: { id: fromAcc.id },
        data: { balance: fromAcc.balance - amount },
      });

      await prisma.sandboxAccount.update({
        where: { id: toAcc.id },
        data: { balance: toAcc.balance + amount },
      });

      const ref = `FP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

      await prisma.sandboxTransaction.create({
        data: {
          userId: user.id,
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          amount,
          status: "COMPLETED",
          reference: ref,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          eventType: "SANDBOX_TRANSFER",
          description: `Transferred ৳${amount.toLocaleString()} from ${fromAccountName} to ${toAccountName} (Ref: ${ref})`,
          metadata: { reference: ref, amount, fromAccountName, toAccountName },
        },
      });
    }

    // Update budgets if provided
    if (budgetAdjustments && Array.isArray(budgetAdjustments)) {
      for (const adj of budgetAdjustments) {
        await prisma.budget.updateMany({
          where: { userId: user.id, category: adj.category },
          data: { limit: adj.newSpending },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          eventType: "BUDGET_UPDATED",
          description: `Adjusted budgets for ${budgetAdjustments.map((a: { category: string }) => a.category).join(", ")}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to execute sandbox action:", error);
    return NextResponse.json({ error: "Failed to execute sandbox action" }, { status: 500 });
  }
}
