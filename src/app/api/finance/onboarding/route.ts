import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateCashFlow, ExpenseItem, IncomeItem } from "@/lib/finance/cash-flow";
import { calculateFinancialHealthScore } from "@/lib/finance/health-score";
import { analyzeGoal } from "@/lib/finance/goal-engine";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        incomes: { include: { history: true } },
        budgets: true,
        bills: true,
        goals: true,
        debts: true,
        sandboxAccounts: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isFixedCategory = (cat: string) => {
      const lower = cat.toLowerCase();
      return (
        lower.includes("rent") ||
        lower.includes("housing") ||
        lower.includes("util") ||
        lower.includes("bill") ||
        lower.includes("internet") ||
        lower.includes("desco") ||
        lower.includes("water") ||
        lower.includes("gas") ||
        lower.includes("fixed")
      );
    };

    const fixedExpenses: { name: string; category: string; amount: number }[] = [];
    const flexibleExpenses: { name: string; category: string; amount: number; minAllowed?: number }[] = [];

    user.budgets.forEach((b) => {
      if (isFixedCategory(b.category)) {
        fixedExpenses.push({ name: b.category, category: b.category, amount: b.limit });
      } else {
        flexibleExpenses.push({ name: b.category, category: b.category, amount: b.limit, minAllowed: 0 });
      }
    });

    const savingsAcc = user.sandboxAccounts.find((a) => a.type === "SAVINGS");
    const emergencyAcc = user.sandboxAccounts.find((a) => a.type === "EMERGENCY");

    const hasExistingData = Boolean(
      user.onboardingCompleted ||
      user.incomes.length > 0 ||
      user.budgets.length > 0 ||
      user.goals.length > 0
    );

    return NextResponse.json({
      hasExistingData,
      onboardingCompleted: user.onboardingCompleted,
      currency: user.currency || "BDT (৳)",
      employmentType: user.employmentType || "Job",
      incomes: user.incomes.map((inc) => ({
        name: inc.name,
        type: inc.type,
        amount: inc.amount,
        frequency: inc.frequency,
        isStable: inc.isStable,
        history: (inc.history || []).map((h) => h.amount).join(", "),
      })),
      fixedExpenses,
      flexibleExpenses,
      savings: {
        currentSavings: savingsAcc?.balance || 0,
        emergencyFund: emergencyAcc?.balance || 0,
      },
      debts: user.debts.map((d) => ({
        name: d.name,
        outstandingAmount: d.outstandingAmount,
        monthlyPayment: d.monthlyPayment,
        interestRate: d.interestRate || undefined,
        dueDate: d.dueDate ? d.dueDate.toISOString().slice(0, 10) : "",
      })),
      bills: user.bills.map((b) => ({
        name: b.name,
        amount: b.amount,
        dueDate: b.dueDate ? b.dueDate.toISOString().slice(0, 10) : "",
        category: b.category,
        isRecurring: b.isRecurring,
      })),
      goals: user.goals.map((g) => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline ? g.deadline.toISOString().slice(0, 10) : "",
        priority: g.priority,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch onboarding data:", error);
    return NextResponse.json({ error: "Failed to load profile data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      currency = "BDT (৳)",
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

    // 2. Clean up previous records safely without wiping user's transactions
    const userIncomes = await prisma.incomeSource.findMany({
      where: { userId },
      select: { id: true },
    });
    if (userIncomes.length > 0) {
      await prisma.incomeHistory.deleteMany({
        where: { incomeSourceId: { in: userIncomes.map((i) => i.id) } },
      });
      await prisma.incomeSource.deleteMany({ where: { userId } });
    }

    await prisma.budget.deleteMany({ where: { userId } });
    await prisma.bill.deleteMany({ where: { userId } });
    await prisma.financialGoal.deleteMany({ where: { userId } });
    await prisma.debt.deleteMany({ where: { userId } });

    // 3. Save Incomes
    if (incomes.length > 0) {
      for (const inc of incomes) {
        if (!inc.name && !inc.amount) continue;
        const createdInc = await prisma.incomeSource.create({
          data: {
            userId,
            name: inc.name?.trim() || "Income Source",
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

    // 4. Save Budgets from Expenses (aggregate by category name to ensure uniqueness)
    const categoryTotals = new Map<string, { limit: number; type: string }>();

    fixedExpenses.forEach((e: { name: string; amount: number; category?: string }) => {
      const cat = (e.name && e.name.trim()) || e.category || "Fixed Expense";
      const amt = parseFloat(e.amount as unknown as string) || 0;
      if (amt > 0 || cat) {
        const current = categoryTotals.get(cat) || { limit: 0, type: "Fixed" };
        categoryTotals.set(cat, { limit: current.limit + amt, type: "Fixed" });
      }
    });

    flexibleExpenses.forEach((e: { name: string; amount: number; category?: string }) => {
      const cat = (e.name && e.name.trim()) || e.category || "Flexible Expense";
      const amt = parseFloat(e.amount as unknown as string) || 0;
      if (amt > 0 || cat) {
        const current = categoryTotals.get(cat) || { limit: 0, type: "Flexible" };
        categoryTotals.set(cat, { limit: current.limit + amt, type: "Flexible" });
      }
    });

    for (const [cat, item] of categoryTotals.entries()) {
      await prisma.budget.create({
        data: {
          userId,
          category: cat,
          limit: item.limit,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
      });
    }

    // 5. Save Bills
    if (bills.length > 0) {
      const validBills = bills.filter((b: { name: string; amount: number }) => b.name?.trim() || b.amount > 0);
      if (validBills.length > 0) {
        await prisma.bill.createMany({
          data: validBills.map((b: { name: string; amount: number; dueDate?: string; category?: string; isRecurring?: boolean; frequency?: string }) => ({
            userId,
            name: b.name?.trim() || "Recurring Bill",
            amount: parseFloat(b.amount as unknown as string) || 0,
            category: b.category || "Utilities",
            dueDate: b.dueDate ? new Date(b.dueDate) : new Date(),
            isRecurring: b.isRecurring ?? true,
            frequency: b.frequency || "Monthly",
            status: "UPCOMING",
          })),
        });
      }
    }

    // 6. Save Goals
    if (goals.length > 0) {
      const validGoals = goals.filter((g: { name: string; targetAmount: number }) => g.name?.trim() || g.targetAmount > 0);
      if (validGoals.length > 0) {
        await prisma.financialGoal.createMany({
          data: validGoals.map((g: { name: string; targetAmount: number; currentAmount?: number; deadline?: string; priority?: string }) => ({
            userId,
            name: g.name?.trim() || "Financial Goal",
            targetAmount: parseFloat(g.targetAmount as unknown as string) || 0,
            currentAmount: parseFloat(g.currentAmount as unknown as string) || 0,
            deadline: g.deadline ? new Date(g.deadline) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            priority: g.priority || "HIGH",
            status: "ACTIVE",
          })),
        });
      }
    }

    // 7. Save Debts
    if (debts.length > 0) {
      const validDebts = debts.filter((d: { name: string; outstandingAmount: number }) => d.name?.trim() || d.outstandingAmount > 0);
      if (validDebts.length > 0) {
        await prisma.debt.createMany({
          data: validDebts.map((d: { name: string; outstandingAmount: number; monthlyPayment: number; interestRate?: number; dueDate?: string }) => ({
            userId,
            name: d.name?.trim() || "Debt Obligation",
            outstandingAmount: parseFloat(d.outstandingAmount as unknown as string) || 0,
            monthlyPayment: parseFloat(d.monthlyPayment as unknown as string) || 0,
            interestRate: d.interestRate ? parseFloat(d.interestRate as unknown as string) : null,
            dueDate: d.dueDate ? new Date(d.dueDate) : null,
          })),
        });
      }
    }

    // 8. Update or Initialize Sandbox Accounts
    const userSavings = parseFloat(savings.currentSavings) || 0;
    const userEmergency = parseFloat(savings.emergencyFund) || 0;
    const availBal = Math.max(0, userSavings - userEmergency);

    const existingAccounts = await prisma.sandboxAccount.findMany({ where: { userId } });
    if (existingAccounts.length > 0) {
      for (const acc of existingAccounts) {
        let newBal = acc.balance;
        if (acc.type === "CHECKING") newBal = availBal;
        else if (acc.type === "SAVINGS") newBal = userSavings;
        else if (acc.type === "EMERGENCY") newBal = userEmergency;
        await prisma.sandboxAccount.update({
          where: { id: acc.id },
          data: { balance: newBal },
        });
      }
    } else {
      await prisma.sandboxAccount.createMany({
        data: [
          { userId, name: "Available Balance", balance: availBal, type: "CHECKING" },
          { userId, name: "General Savings", balance: userSavings, type: "SAVINGS" },
          { userId, name: "Emergency Fund", balance: userEmergency, type: "EMERGENCY" },
          { userId, name: "Goal Fund", balance: 0, type: "GOAL" },
        ],
      });
    }

    // 9. Run Deterministic Analysis
    const formattedIncomes: IncomeItem[] = incomes
      .filter((inc: { name: string; amount: number }) => inc.name?.trim() || inc.amount > 0)
      .map((inc: { name: string; amount: number; isStable: boolean }) => ({
        name: inc.name,
        amount: parseFloat(inc.amount as unknown as string) || 0,
        frequency: "Monthly",
        isStable: inc.isStable !== false,
      }));

    const formattedExpenses: ExpenseItem[] = [
      ...fixedExpenses
        .filter((e: { name: string; amount: number }) => e.name?.trim() || e.amount > 0)
        .map((e: { name: string; amount: number; category?: string }) => ({
          description: e.name,
          amount: parseFloat(e.amount as unknown as string) || 0,
          category: e.category || e.name,
          type: "Fixed" as const,
        })),
      ...flexibleExpenses
        .filter((e: { name: string; amount: number }) => e.name?.trim() || e.amount > 0)
        .map((e: { name: string; amount: number; category?: string }) => ({
          description: e.name,
          amount: parseFloat(e.amount as unknown as string) || 0,
          category: e.category || e.name,
          type: "Flexible" as const,
        })),
    ];

    const cashFlow = calculateCashFlow(formattedIncomes, formattedExpenses);

    const primaryGoal = goals.find((g: { name: string; targetAmount: number }) => g.name?.trim() || g.targetAmount > 0);
    const goalAnalysisResult = primaryGoal
      ? analyzeGoal(
          {
            name: primaryGoal.name || "Primary Goal",
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
        eventType: "PROFILE_UPDATED",
        description: `Financial profile updated. Recalculated Health Score: ${healthScore.totalScore}/100, Monthly Surplus: ৳${cashFlow.monthlySurplus.toLocaleString()}`,
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
    return NextResponse.json({ error: "Failed to update financial profile" }, { status: 500 });
  }
}
