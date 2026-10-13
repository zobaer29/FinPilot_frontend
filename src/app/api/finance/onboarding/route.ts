import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateCashFlow, ExpenseItem, IncomeItem } from "@/lib/finance/cash-flow";
import { calculateFinancialHealthScore } from "@/lib/finance/health-score";
import { analyzeGoal } from "@/lib/finance/goal-engine";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      currency = "BDT",
      employmentType = "Job",
      incomes = [],
      fixedExpenses = [],
      flexibleExpenses = [],
      savings = { currentSavings: 0, emergencyFund: 0 },
      debts = [],
      bills = [],
      goals = [],
    } = body;

    const userId = session.id;

    // 1. Update user info
    await prisma.user.update({
      where: { id: userId },
      data: {
        currency,
        employmentType,
        onboardingCompleted: true,
      },
    });

    // Clean up previous onboarding data
    await prisma.incomeSource.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.budget.deleteMany({ where: { userId } });
    await prisma.bill.deleteMany({ where: { userId } });
    await prisma.financialGoal.deleteMany({ where: { userId } });
    await prisma.debt.deleteMany({ where: { userId } });
    await prisma.sandboxAccount.deleteMany({ where: { userId } });

    // 2. Save Incomes
    if (incomes.length > 0) {
      for (const inc of incomes) {
        const createdInc = await prisma.incomeSource.create({
          data: {
            userId,
            name: inc.name || "Primary Income",
            amount: parseFloat(inc.amount) || 0,
            type: inc.type || "Salary",
            frequency: inc.frequency || "Monthly",
            isStable: inc.isStable !== false,
          },
        });

        if (inc.history && Array.isArray(inc.history)) {
          for (const histVal of inc.history) {
            await prisma.incomeHistory.create({
              data: {
                incomeSourceId: createdInc.id,
                amount: parseFloat(histVal) || 0,
              },
            });
          }
        }
      }
    }

    // 3. Save Budgets from Expenses
    const allExpenses = [
      ...fixedExpenses.map((e: { name: string; amount: number; category?: string }) => ({
        category: e.category || e.name || "Housing",
        limit: parseFloat(e.amount as unknown as string) || 0,
        type: "Fixed",
      })),
      ...flexibleExpenses.map((e: { category?: string; name: string; amount: number }) => ({
        category: e.category || e.name || "Food",
        limit: parseFloat(e.amount as unknown as string) || 0,
        type: "Flexible",
      })),
    ];

    for (const exp of allExpenses) {
      await prisma.budget.create({
        data: {
          userId,
          category: exp.category,
          limit: exp.limit,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
      });
    }

    // 4. Save Bills
    if (bills.length > 0) {
      await prisma.bill.createMany({
        data: bills.map((b: { name: string; amount: number; dueDate?: string; category?: string; isRecurring?: boolean; frequency?: string }) => ({
          userId,
          name: b.name,
          amount: parseFloat(b.amount as unknown as string) || 0,
          category: b.category || "Utilities",
          dueDate: b.dueDate ? new Date(b.dueDate) : new Date(),
          isRecurring: b.isRecurring ?? true,
          frequency: b.frequency || "Monthly",
          status: "UPCOMING",
        })),
      });
    }

    // 5. Save Goals
    if (goals.length > 0) {
      await prisma.financialGoal.createMany({
        data: goals.map((g: { name: string; targetAmount: number; currentAmount?: number; deadline?: string; priority?: string }) => ({
          userId,
          name: g.name,
          targetAmount: parseFloat(g.targetAmount as unknown as string) || 0,
          currentAmount: parseFloat(g.currentAmount as unknown as string) || 0,
          deadline: g.deadline ? new Date(g.deadline) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          priority: g.priority || "HIGH",
          status: "ACTIVE",
        })),
      });
    }

    // 6. Save Debts
    if (debts.length > 0) {
      await prisma.debt.createMany({
        data: debts.map((d: { name: string; outstandingAmount: number; monthlyPayment: number; interestRate?: number; dueDate?: string }) => ({
          userId,
          name: d.name,
          outstandingAmount: parseFloat(d.outstandingAmount as unknown as string) || 0,
          monthlyPayment: parseFloat(d.monthlyPayment as unknown as string) || 0,
          interestRate: d.interestRate ? parseFloat(d.interestRate as unknown as string) : null,
          dueDate: d.dueDate ? new Date(d.dueDate) : null,
        })),
      });
    }

    // 7. Initialize Sandbox Accounts strictly from user input
    const userSavings = parseFloat(savings.currentSavings) || 0;
    const userEmergency = parseFloat(savings.emergencyFund) || 0;
    const availBal = Math.max(0, userSavings - userEmergency);
    await prisma.sandboxAccount.createMany({
      data: [
        { userId, name: "Available Balance", balance: availBal, type: "CHECKING" },
        { userId, name: "General Savings", balance: userSavings, type: "SAVINGS" },
        { userId, name: "Emergency Fund", balance: userEmergency, type: "EMERGENCY" },
        { userId, name: "Goal Fund", balance: 0, type: "GOAL" },
      ],
    });

    // 8. Run Deterministic Analysis
    const formattedIncomes: IncomeItem[] = incomes.map((inc: { name: string; amount: number; isStable: boolean }) => ({
      name: inc.name,
      amount: parseFloat(inc.amount as unknown as string) || 0,
      frequency: "Monthly",
      isStable: inc.isStable !== false,
    }));

    const formattedExpenses: ExpenseItem[] = [
      ...fixedExpenses.map((e: { name: string; amount: number; category?: string }) => ({
        description: e.name,
        amount: parseFloat(e.amount as unknown as string) || 0,
        category: e.category || e.name,
        type: "Fixed" as const,
      })),
      ...flexibleExpenses.map((e: { name: string; amount: number; category?: string }) => ({
        description: e.name,
        amount: parseFloat(e.amount as unknown as string) || 0,
        category: e.category || e.name,
        type: "Flexible" as const,
      })),
    ];

    const cashFlow = calculateCashFlow(formattedIncomes, formattedExpenses);

    const primaryGoal = goals[0];
    const goalAnalysisResult = primaryGoal
      ? analyzeGoal(
          {
            name: primaryGoal.name,
            targetAmount: parseFloat(primaryGoal.targetAmount) || 0,
            currentAmount: parseFloat(primaryGoal.currentAmount) || 0,
            monthsRemaining: 6,
            priority: "HIGH",
          },
          cashFlow.monthlySurplus
        )
      : null;

    const healthScore = calculateFinancialHealthScore({
      savingsRate: cashFlow.savingsRate,
      budgetUtilization: 85,
      debtToIncomeRatio: debts.length > 0 ? 15 : 0,
      emergencyFundMonths:
        cashFlow.totalExpenses > 0 ? (savings.emergencyFund || 0) / cashFlow.totalExpenses : 1,
      incomeStabilityScore: cashFlow.incomeVolatilityScore,
      activeGoalOnTrackRate: goalAnalysisResult?.status === "ACHIEVABLE" ? 100 : 50,
    });

    // Create Audit Log entry
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: "ANALYSIS_RUN",
        description: `Financial onboarding completed. Initialized Financial Health Score: ${healthScore.totalScore}/100`,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        cashFlow,
        healthScore,
        primaryGoalAnalysis: goalAnalysisResult,
        currency,
        employmentType,
      },
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
