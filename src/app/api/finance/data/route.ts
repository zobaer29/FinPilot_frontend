import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    const userQuery = session ? { id: session.id } : { email: "alex@finpilot.ai" };

    const user = await prisma.user.findFirst({
      where: userQuery,
      include: {
        incomes: true,
        transactions: { orderBy: { date: "desc" } },
        budgets: true,
        bills: { orderBy: { dueDate: "asc" } },
        goals: { orderBy: { deadline: "asc" } },
        sandboxAccounts: true,
        auditLogs: { orderBy: { createdAt: "desc" } },
        sandboxTransactions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!user) {
      return NextResponse.json({
        user: null,
        incomes: [],
        transactions: [],
        budgets: [],
        bills: [],
        goals: [],
        sandboxAccounts: [],
        auditLogs: [],
        sandboxTransactions: [],
      });
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      incomes: user.incomes,
      transactions: user.transactions,
      budgets: user.budgets,
      bills: user.bills,
      goals: user.goals,
      sandboxAccounts: user.sandboxAccounts,
      auditLogs: user.auditLogs,
      sandboxTransactions: user.sandboxTransactions,
    });
  } catch (error) {
    console.error("Failed to fetch finance data:", error);
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await getSessionUser();
    const userQuery = session ? { id: session.id } : { email: "alex@finpilot.ai" };
    const user = await prisma.user.findFirst({ where: userQuery });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (body.transactions && Array.isArray(body.transactions)) {
      const created = await prisma.transaction.createMany({
        data: body.transactions.map((t: {
          description: string;
          category: string;
          amount: number;
          type: string;
          date?: string;
          predictedCategory?: string;
          predictionConfidence?: number;
          source?: string;
        }) => ({
          userId: user.id,
          description: t.description,
          category: t.category,
          amount: t.amount,
          type: t.type,
          date: t.date ? new Date(t.date) : new Date(),
          predictedCategory: t.predictedCategory,
          predictionConfidence: t.predictionConfidence,
          source: t.source || "csv",
        })),
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          eventType: "CSV_IMPORT",
          description: `Imported ${created.count} transactions into database`,
        },
      });

      return NextResponse.json({ count: created.count });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error) {
    console.error("Failed to save transactions:", error);
    return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 });
  }
}
