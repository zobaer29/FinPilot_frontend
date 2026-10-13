import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    let user = await prisma.user.findFirst({
      where: { email: "alex@finpilot.ai" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "alex@finpilot.ai",
          name: "Alex",
        },
      });
    }

    // Reset records for this user
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.incomeSource.deleteMany({ where: { userId: user.id } });
    await prisma.budget.deleteMany({ where: { userId: user.id } });
    await prisma.bill.deleteMany({ where: { userId: user.id } });
    await prisma.financialGoal.deleteMany({ where: { userId: user.id } });
    await prisma.sandboxAccount.deleteMany({ where: { userId: user.id } });
    await prisma.sandboxTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });

    // 1. Incomes
    await prisma.incomeSource.createMany({
      data: [
        { userId: user.id, name: "Job Salary", amount: 40000, type: "Salary", frequency: "Monthly", isStable: true },
        { userId: user.id, name: "Freelance Clients", amount: 20000, type: "Freelance", frequency: "Monthly", isStable: false },
      ],
    });

    // 2. Transactions
    await prisma.transaction.createMany({
      data: [
        { userId: user.id, description: "Job Salary Deposit", category: "Income", amount: 40000, type: "Income", date: new Date("2026-10-01"), source: "manual" },
        { userId: user.id, description: "House Rent", category: "Housing", amount: 15000, type: "Expense", date: new Date("2026-10-03"), source: "manual" },
        { userId: user.id, description: "Foodpanda Dinner", category: "Food", amount: 850, type: "Expense", date: new Date("2026-10-04"), predictedCategory: "Food", predictionConfidence: 0.94, source: "csv" },
        { userId: user.id, description: "Pathao Ride", category: "Transport", amount: 320, type: "Expense", date: new Date("2026-10-05"), predictedCategory: "Transport", predictionConfidence: 0.91, source: "csv" },
        { userId: user.id, description: "Freelance Payment", category: "Income", amount: 12000, type: "Income", date: new Date("2026-10-06"), source: "manual" },
        { userId: user.id, description: "Daraz Online Shopping", category: "Shopping", amount: 2200, type: "Expense", date: new Date("2026-10-08"), predictedCategory: "Shopping", predictionConfidence: 0.88, source: "csv" },
        { userId: user.id, description: "DESCO Electricity Bill", category: "Utilities", amount: 2400, type: "Expense", date: new Date("2026-10-10"), predictedCategory: "Utilities", predictionConfidence: 0.95, source: "csv" },
        { userId: user.id, description: "Grocery Market", category: "Food", amount: 3200, type: "Expense", date: new Date("2026-10-12"), predictedCategory: "Food", predictionConfidence: 0.92, source: "csv" },
      ],
    });

    // 3. Budgets
    await prisma.budget.createMany({
      data: [
        { userId: user.id, category: "Housing", limit: 15000, month: 10, year: 2026 },
        { userId: user.id, category: "Food", limit: 10000, month: 10, year: 2026 },
        { userId: user.id, category: "Shopping", limit: 5000, month: 10, year: 2026 },
        { userId: user.id, category: "Transport", limit: 4000, month: 10, year: 2026 },
        { userId: user.id, category: "Utilities", limit: 4500, month: 10, year: 2026 },
        { userId: user.id, category: "Pocket Money", limit: 6000, month: 10, year: 2026 },
      ],
    });

    // 4. Bills
    await prisma.bill.createMany({
      data: [
        { userId: user.id, name: "DESCO Electricity", amount: 2400, category: "Utilities", dueDate: new Date("2026-10-18"), isRecurring: true, status: "UPCOMING" },
        { userId: user.id, name: "Link3 Broadband", amount: 1200, category: "Utilities", dueDate: new Date("2026-10-20"), isRecurring: true, status: "UPCOMING" },
        { userId: user.id, name: "Netflix Subscription", amount: 1250, category: "Entertainment", dueDate: new Date("2026-10-25"), isRecurring: true, status: "UPCOMING" },
        { userId: user.id, name: "House Rent", amount: 15000, category: "Housing", dueDate: new Date("2026-10-03"), isRecurring: true, status: "PAID" },
      ],
    });

    // 5. Goals
    await prisma.financialGoal.createMany({
      data: [
        { userId: user.id, name: "Laptop", targetAmount: 100000, currentAmount: 20000, deadline: new Date("2027-04-13"), priority: "HIGH" },
        { userId: user.id, name: "Emergency Fund", targetAmount: 60000, currentAmount: 25000, deadline: new Date("2027-06-13"), priority: "HIGH" },
        { userId: user.id, name: "Annual Vacation", targetAmount: 30000, currentAmount: 10000, deadline: new Date("2027-03-13"), priority: "LOW" },
      ],
    });

    // 6. Sandbox Accounts
    await prisma.sandboxAccount.createMany({
      data: [
        { userId: user.id, name: "Available Balance", balance: 35000, type: "CHECKING" },
        { userId: user.id, name: "General Savings", balance: 60000, type: "SAVINGS" },
        { userId: user.id, name: "Emergency Fund", balance: 25000, type: "EMERGENCY" },
        { userId: user.id, name: "Laptop Fund", balance: 20000, type: "GOAL" },
      ],
    });

    // 7. Audit Log
    await prisma.auditLog.createMany({
      data: [
        { userId: user.id, eventType: "CSV_IMPORT", description: "Demo transactions imported into MongoDB" },
        { userId: user.id, eventType: "ANALYSIS_RUN", description: "Financial health score initialized (75/100)" },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to seed database:", error);
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
}
