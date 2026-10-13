"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { calculateCashFlow, ExpenseItem, IncomeItem } from "@/lib/finance/cash-flow";
import { calculateFinancialHealthScore } from "@/lib/finance/health-score";
import { evaluateBudgets, CategoryBudget } from "@/lib/finance/budget-engine";
import { analyzeGoal, FinancialGoalItem } from "@/lib/finance/goal-engine";
import { generateGoalRecommendation, RecommendationPlan } from "@/lib/finance/recommendation-engine";
import { defaultSandbox, SandboxAccountState, AuditRecord, SandboxTransactionRecord } from "@/lib/sandbox/sandbox-engine";

interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "Income" | "Expense";
  date: string;
  isPredicted?: boolean;
  confidence?: number;
}

interface BillItem {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  status: "UPCOMING" | "PAID" | "OVERDUE";
  isRecurring: boolean;
}

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(amount);

const INITIAL_INCOMES: IncomeItem[] = [
  { id: "inc-1", name: "Job Salary", amount: 40000, frequency: "Monthly", isStable: true },
  { id: "inc-2", name: "Freelance Clients", amount: 20000, frequency: "Monthly", isStable: false, history: [16000, 24000, 18000, 22000] },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "tx-1", description: "Job Salary Deposit", category: "Income", amount: 40000, type: "Income", date: "2026-10-01" },
  { id: "tx-2", description: "House Rent", category: "Housing", amount: 15000, type: "Expense", date: "2026-10-03" },
  { id: "tx-3", description: "Foodpanda Dinner", category: "Food", amount: 850, type: "Expense", date: "2026-10-04", isPredicted: true, confidence: 0.94 },
  { id: "tx-4", description: "Pathao Ride", category: "Transport", amount: 320, type: "Expense", date: "2026-10-05", isPredicted: true, confidence: 0.91 },
  { id: "tx-5", description: "Freelance Payment", category: "Income", amount: 12000, type: "Income", date: "2026-10-06" },
  { id: "tx-6", description: "Daraz Online Shopping", category: "Shopping", amount: 2200, type: "Expense", date: "2026-10-08", isPredicted: true, confidence: 0.88 },
  { id: "tx-7", description: "DESCO Electricity Bill", category: "Utilities", amount: 2400, type: "Expense", date: "2026-10-10", isPredicted: true, confidence: 0.95 },
  { id: "tx-8", description: "Grocery Market", category: "Food", amount: 3200, type: "Expense", date: "2026-10-12", isPredicted: true, confidence: 0.92 },
];

const INITIAL_BUDGETS: CategoryBudget[] = [
  { category: "Housing", limit: 15000, spent: 15000, type: "Fixed" },
  { category: "Food", limit: 10000, spent: 7850, type: "Flexible" },
  { category: "Shopping", limit: 5000, spent: 3200, type: "Flexible" },
  { category: "Transport", limit: 4000, spent: 2320, type: "Flexible" },
  { category: "Utilities", limit: 4500, spent: 2400, type: "Fixed" },
  { category: "Pocket Money", limit: 6000, spent: 4800, type: "Flexible" },
];

const INITIAL_BILLS: BillItem[] = [
  { id: "b-1", name: "DESCO Electricity", amount: 2400, dueDate: "2026-10-18", category: "Utilities", status: "UPCOMING", isRecurring: true },
  { id: "b-2", name: "Link3 Broadband Internet", amount: 1200, dueDate: "2026-10-20", category: "Utilities", status: "UPCOMING", isRecurring: true },
  { id: "b-3", name: "Netflix Subscription", amount: 1250, dueDate: "2026-10-25", category: "Entertainment", status: "UPCOMING", isRecurring: true },
  { id: "b-4", name: "House Rent", amount: 15000, dueDate: "2026-10-03", category: "Housing", status: "PAID", isRecurring: true },
];

const INITIAL_GOALS: FinancialGoalItem[] = [
  { id: "g-1", name: "Laptop", targetAmount: 100000, currentAmount: 20000, monthsRemaining: 6, priority: "HIGH" },
  { id: "g-2", name: "Emergency Fund", targetAmount: 60000, currentAmount: 25000, monthsRemaining: 8, priority: "HIGH" },
  { id: "g-3", name: "Annual Vacation", targetAmount: 30000, currentAmount: 10000, monthsRemaining: 5, priority: "LOW" },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState<string>("Dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(INITIAL_BUDGETS);
  const [goals] = useState<FinancialGoalItem[]>(INITIAL_GOALS);
  const [bills] = useState<BillItem[]>(INITIAL_BILLS);
  const [sandboxAccounts, setSandboxAccounts] = useState<SandboxAccountState[]>(defaultSandbox.getAccounts());
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(defaultSandbox.getAuditLogs());
  const [sandboxTxHistory, setSandboxTxHistory] = useState<SandboxTransactionRecord[]>(defaultSandbox.getTransactions());

  // Problem Box State
  const [problemQuery, setProblemQuery] = useState(
    "I need ৳100,000 for a laptop within six months, but my freelance income changes every month. Can I afford it?"
  );
  const [activePlan, setActivePlan] = useState<RecommendationPlan | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [planApproved, setPlanApproved] = useState(false);

  // CSV Import State
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  // Financial calculations
  const expensesList: ExpenseItem[] = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "Expense")
        .map((t) => ({
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.category === "Housing" || t.category === "Utilities" ? "Fixed" : "Flexible",
        })),
    [transactions]
  );

  const cashFlow = useMemo(() => calculateCashFlow(INITIAL_INCOMES, expensesList), [expensesList]);

  const budgetEvaluation = useMemo(() => evaluateBudgets(budgets), [budgets]);

  const primaryGoal = goals[0];
  const goalAnalysis = useMemo(
    () => analyzeGoal(primaryGoal, cashFlow.safeConservativeIncome - cashFlow.totalExpenses),
    [primaryGoal, cashFlow]
  );

  const healthReport = useMemo(
    () =>
      calculateFinancialHealthScore({
        savingsRate: cashFlow.savingsRate,
        budgetUtilization: budgetEvaluation.overallUtilization,
        debtToIncomeRatio: 12,
        emergencyFundMonths: 2.5,
        incomeStabilityScore: cashFlow.incomeVolatilityScore,
        activeGoalOnTrackRate: goalAnalysis.status === "ACHIEVABLE" ? 100 : 50,
      }),
    [cashFlow, budgetEvaluation, goalAnalysis]
  );

  // Problem Box trigger
  const handleAnalyzeProblem = async () => {
    setIsClassifying(true);
    setPlanApproved(false);

    try {
      // Attempt backend ML service call with fallback
      let detectedType = "GOAL_PLANNING";
      try {
        const mlUrl = process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${mlUrl}/ml/problem-classification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: problemQuery }),
        });
        if (res.ok) {
          const data = await res.json();
          detectedType = data.problemType;
        }
      } catch {
        // Fallback to local heuristic
        detectedType = "GOAL_PLANNING";
      }

      const plan = generateGoalRecommendation({
        goalName: primaryGoal.name,
        targetAmount: primaryGoal.targetAmount - primaryGoal.currentAmount,
        monthsRemaining: primaryGoal.monthsRemaining,
        safeCapacity: Math.max(cashFlow.monthlySurplus, 10000),
        flexibleCategories: [
          { category: "Food", amount: 10000, minAllowed: 8500 },
          { category: "Pocket Money", amount: 6000, minAllowed: 4500 },
          { category: "Shopping", amount: 5000, minAllowed: 4000 },
        ],
      });

      plan.problemType = detectedType;
      setActivePlan(plan);

      const aud = defaultSandbox.addAuditLog(
        "PROBLEM_CLASSIFIED",
        `Classified query as ${detectedType} (${plan.summary})`
      );
      setAuditLogs([aud, ...defaultSandbox.getAuditLogs()]);
    } finally {
      setIsClassifying(false);
    }
  };

  // Plan approval execution in sandbox
  const handleApprovePlan = () => {
    if (!activePlan) return;

    // 1. Update budgets
    setBudgets((prev) =>
      prev.map((b) => {
        const adj = activePlan.adjustments.find((a) => a.category === b.category);
        return adj ? { ...b, limit: adj.newSpending } : b;
      })
    );

    // 2. Execute simulated transfer in sandbox
    const transferRes = defaultSandbox.executeTransfer(
      "Available Balance",
      "Laptop Fund",
      5000
    );

    if (transferRes.success) {
      setSandboxAccounts(defaultSandbox.getAccounts());
      setSandboxTxHistory(defaultSandbox.getTransactions());
    }

    // 3. Log audit event
    const aud = defaultSandbox.addAuditLog(
      "PLAN_APPROVED",
      `User Alex approved plan for ${primaryGoal.name}. Reduced flexible budgets and transferred ৳5,000 to Laptop Fund.`
    );

    setAuditLogs([aud, ...defaultSandbox.getAuditLogs()]);
    setPlanApproved(true);
  };

  // CSV statement import handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<{ date?: string; description?: string; amount?: string; type?: string; category?: string }>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: Transaction[] = results.data
          .filter((row) => row.description && row.amount)
          .map((row, index) => ({
            id: `csv-${Date.now()}-${index}`,
            description: row.description || "Unknown",
            category: row.category || "General",
            amount: Math.abs(parseFloat(row.amount || "0")),
            type: (row.type?.toLowerCase() === "income" ? "Income" : "Expense") as "Income" | "Expense",
            date: row.date || new Date().toISOString().slice(0, 10),
            isPredicted: true,
            confidence: 0.92,
          }));

        if (parsed.length > 0) {
          setTransactions((prev) => [...parsed, ...prev]);
          setCsvStatus(`Successfully imported and categorized ${parsed.length} transactions.`);
          const aud = defaultSandbox.addAuditLog("CSV_IMPORT", `Imported ${parsed.length} transactions via CSV statement`);
          setAuditLogs([aud, ...defaultSandbox.getAuditLogs()]);
        }
      },
      error: () => {
        setCsvStatus("Error reading CSV file.");
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        {/* Navigation Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-7 lg:flex">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#155eef] text-lg font-bold text-white shadow-sm">
              FP
            </div>
            <div>
              <p className="font-bold tracking-tight text-slate-900">FinPilot AI</p>
              <p className="text-xs text-slate-400">Personal Finance Agent</p>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { name: "Dashboard", icon: "▦" },
              { name: "Transactions", icon: "↔" },
              { name: "Budget", icon: "◫" },
              { name: "Bills", icon: "▣" },
              { name: "Goals", icon: "◎" },
              { name: "Agent", icon: "✦" },
              { name: "History", icon: "◷" },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveNav(item.name)}
                className={`flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all ${
                  activeNav === item.name
                    ? "bg-blue-50 text-[#155eef] shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>

          {/* Sandbox Indicator */}
          <div className="mt-auto rounded-2xl bg-slate-900 p-4 text-white">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-semibold text-slate-300">Sandbox Environment</p>
            </div>
            <p className="mt-1 text-sm font-bold">Safe Simulated Actions</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Actions are permission-checked and executed in sandbox accounts.
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10">
          {/* Header */}
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tuesday, October 13, 2026</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Good morning, Alex</h1>
              <p className="mt-1 text-sm text-slate-500">FinPilot has analyzed your cash flow, bills, and savings goals.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveNav("Agent")}
                className="rounded-xl bg-[#155eef] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
              >
                ✦ Open Problem Box
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#155eef]">
                A
              </div>
            </div>
          </header>

          {/* View: DASHBOARD */}
          {activeNav === "Dashboard" && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Total Monthly Income" value={formatMoney(cashFlow.totalIncome)} detail="৳40k Salary + ৳20k Freelance" positive />
                <Metric label="Total Expenses" value={formatMoney(cashFlow.totalExpenses)} detail={`${cashFlow.expenseRatio}% of income`} />
                <Metric label="Safe Monthly Surplus" value={formatMoney(cashFlow.monthlySurplus)} detail="Available to save or invest" positive />
                <Metric label="Savings Rate" value={`${cashFlow.savingsRate}%`} detail="Target benchmark: 20%" positive={cashFlow.savingsRate >= 20} />
              </div>

              {/* Health Score & Category Progress */}
              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                {/* Health Score Card */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Financial Health Score</h2>
                      <p className="text-xs text-slate-500">{healthReport.summary}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {healthReport.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-8">
                    <div
                      className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(#155eef 0deg ${healthReport.totalScore * 3.6}deg, #e8eef8 ${healthReport.totalScore * 3.6}deg 360deg)`,
                      }}
                    >
                      <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
                        <div className="text-center">
                          <p className="text-4xl font-extrabold text-slate-900">{healthReport.totalScore}</p>
                          <p className="text-xs text-slate-400">out of 100</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid flex-1 grid-cols-2 gap-4 w-full">
                      {healthReport.components.slice(0, 4).map((c) => (
                        <div key={c.name} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                          <p className="text-xs text-slate-500">{c.name}</p>
                          <p className="mt-1 text-base font-bold text-slate-900">
                            {c.score}/{c.maxPoints}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400 leading-4 truncate">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Spending by Category Card */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Category Budgets</h2>
                      <p className="text-xs text-slate-500">{budgetEvaluation.overallUtilization}% of total budget utilized</p>
                    </div>
                    <button onClick={() => setActiveNav("Budget")} className="text-xs font-bold text-[#155eef] hover:underline">
                      View all
                    </button>
                  </div>
                  <div className="space-y-4">
                    {budgets.slice(0, 4).map((b) => {
                      const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
                      const isHigh = pct >= 90;
                      return (
                        <div key={b.category}>
                          <div className="mb-1.5 flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">{b.category}</span>
                            <span className="font-bold text-slate-900">
                              {formatMoney(b.spent)} / {formatMoney(b.limit)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isHigh ? "bg-amber-500" : "bg-[#155eef]"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Transactions and Quick Recommendation */}
              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                {/* Recent Transactions */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
                      <p className="text-xs text-slate-500">Classified using ML categorization models</p>
                    </div>
                    <button onClick={() => setActiveNav("Transactions")} className="text-xs font-bold text-[#155eef] hover:underline">
                      See all
                    </button>
                  </div>
                  <div className="space-y-3.5">
                    {transactions.slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-50 transition">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-sm">
                            {t.category === "Food" ? "🍜" : t.category === "Housing" ? "⌂" : t.category === "Transport" ? "↗" : t.category === "Utilities" ? "⚡" : "◇"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{t.description}</p>
                            <p className="text-xs text-slate-400">
                              {t.category} · {t.date}
                              {t.confidence && <span className="ml-2 text-emerald-600">({Math.round(t.confidence * 100)}% conf)</span>}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${t.type === "Income" ? "text-emerald-600" : "text-slate-800"}`}>
                          {t.type === "Income" ? "+" : "-"}{formatMoney(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Primary Agent Recommendation Banner */}
                <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-lg text-[#155eef]">✦</span>
                      <h2 className="text-base font-bold text-slate-900">Active FinPilot Recommendation</h2>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#155eef]">Goal Planning</p>
                      <h3 className="mt-1 text-sm font-bold text-slate-900">Your Laptop goal needs monthly adjustments</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Target: ৳100,000 in 6 months. Required saving: {formatMoney(13333)}/month. Safe current surplus: {formatMoney(cashFlow.monthlySurplus)}.
                      </p>
                      <div className="mt-3 rounded-lg bg-blue-50/60 p-2.5 text-xs text-slate-700">
                        Adjusting flexible expenses recovered <strong>+৳4,000/mo</strong> capacity.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveNav("Agent")}
                    className="mt-4 w-full rounded-xl bg-[#155eef] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    Open Agent Workspace →
                  </button>
                </section>
              </div>
            </div>
          )}

          {/* View: TRANSACTIONS */}
          {activeNav === "Transactions" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Transaction Management</h2>
                  <p className="text-xs text-slate-500">Upload bank or MFS CSV statements for automatic ML categorization</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl bg-[#155eef] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition">
                    Upload CSV Statement
                    <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {csvStatus && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
                  ✓ {csvStatus}
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Description</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-800">{t.description}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#155eef]">
                            {t.category}
                            {t.confidence && <span className="ml-1 opacity-75">· {Math.round(t.confidence * 100)}%</span>}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{t.date}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600">{t.type}</td>
                        <td className={`px-5 py-3.5 text-right font-bold ${t.type === "Income" ? "text-emerald-600" : "text-slate-800"}`}>
                          {t.type === "Income" ? "+" : "-"}{formatMoney(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View: BUDGET */}
          {activeNav === "Budget" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Smart Budgeting</h2>
                <p className="text-xs text-slate-500">Fixed costs are strictly protected; flexible categories can be tuned by the agent</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {budgets.map((b) => {
                    const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
                    return (
                      <div key={b.category} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{b.category}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${b.type === "Fixed" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-[#155eef]"}`}>
                            {b.type}
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-extrabold text-slate-900">{formatMoney(b.spent)}</p>
                        <p className="text-xs text-slate-400">Limit: {formatMoney(b.limit)} ({pct}%)</p>
                        <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div className={`h-full ${pct > 90 ? "bg-amber-500" : "bg-[#155eef]"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* View: BILLS */}
          {activeNav === "Bills" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Bills & Subscriptions</h2>
                <p className="text-xs text-slate-500">Upcoming payment dates, recurring bills, and subscriptions</p>
                <div className="mt-6 divide-y divide-slate-100">
                  {bills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-3.5">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bill.name}</p>
                        <p className="text-xs text-slate-400">Due: {bill.dueDate} · {bill.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatMoney(bill.amount)}</p>
                        <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${bill.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {bill.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View: GOALS */}
          {activeNav === "Goals" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Financial Goals</h2>
                <p className="text-xs text-slate-500">Goal feasibility based on safe conservative monthly income</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {goals.map((g) => {
                    const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
                    const reqMonthly = Math.round((g.targetAmount - g.currentAmount) / g.monthsRemaining);
                    return (
                      <div key={g.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">{g.name}</h3>
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#155eef]">{g.priority}</span>
                        </div>
                        <p className="mt-3 text-lg font-extrabold text-slate-900">{formatMoney(g.currentAmount)}</p>
                        <p className="text-xs text-slate-400">Target: {formatMoney(g.targetAmount)} in {g.monthsRemaining} months</p>
                        <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Required: <strong>{formatMoney(reqMonthly)}/month</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* View: AGENT (PROBLEM BOX) */}
          {activeNav === "Agent" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-white p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl text-[#155eef]">✦</span>
                  <h2 className="text-xl font-bold text-slate-900">FinPilot Problem Box</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Type your financial question in plain language. FinPilot classifies the problem with ML and runs deterministic financial plans.
                </p>

                {/* Query Input */}
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={problemQuery}
                    onChange={(e) => setProblemQuery(e.target.value)}
                    placeholder="e.g. I want to buy a 100,000 taka laptop in six months..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155eef]"
                  />
                  <button
                    onClick={handleAnalyzeProblem}
                    disabled={isClassifying}
                    className="rounded-xl bg-[#155eef] px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isClassifying ? "Classifying..." : "Analyze Problem"}
                  </button>
                </div>

                {/* Prompt Pills */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {[
                    "I need ৳100,000 for a laptop within six months, but my freelance income changes every month. Can I afford it?",
                    "I earn 60,000 taka but cannot save 10,000 every month.",
                    "Why am I overspending on dining and food delivery?",
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setProblemQuery(preset)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-blue-400 hover:text-[#155eef] transition"
                    >
                      {preset.slice(0, 50)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Plan Card */}
              {activePlan && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#155eef]">
                        Problem: {activePlan.problemType}
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-slate-900">{activePlan.summary}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Feasible via adjustments
                    </span>
                  </div>

                  <p className="text-xs leading-6 text-slate-600 bg-slate-50 p-4 rounded-xl">
                    {activePlan.explanation}
                  </p>

                  <div className="grid gap-4 sm:grid-cols-3 text-xs">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-400">Required Saving</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{formatMoney(activePlan.requiredMonthlySavings)}/mo</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-400">Recovered from Cuts</p>
                      <p className="mt-1 text-base font-bold text-emerald-600">+{formatMoney(activePlan.totalRecovered)}/mo</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-400">New Safe Capacity</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{formatMoney(activePlan.newSafeCapacity)}/mo</p>
                    </div>
                  </div>

                  {/* Proposed Actions */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Proposed Actions</h4>
                    <div className="space-y-2">
                      {activePlan.proposedActions.map((act, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-700 rounded-lg bg-slate-50 p-2.5">
                          <span className="text-[#155eef] font-bold">✓</span>
                          <span>{act.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sandbox Approval Buttons */}
                  <div className="pt-2">
                    {planApproved ? (
                      <div className="rounded-xl bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-700">
                        ✓ Plan successfully approved and applied in sandbox environment!
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={handleApprovePlan}
                          className="flex-1 rounded-xl bg-[#155eef] py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                        >
                          Approve and Execute in Sandbox
                        </button>
                        <button
                          onClick={() => setActivePlan(null)}
                          className="rounded-xl border border-slate-200 px-6 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View: HISTORY & AUDIT LOG */}
          {activeNav === "History" && (
            <div className="space-y-6">
              {/* Sandbox Accounts Snapshot */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Sandbox Balances</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {sandboxAccounts.map((acc) => (
                    <div key={acc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">{acc.name}</p>
                      <p className="mt-1 text-lg font-extrabold text-slate-900">{formatMoney(acc.balance)}</p>
                      <span className="mt-2 inline-block rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {acc.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sandbox Transfers */}
              {sandboxTxHistory.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Sandbox Execution Records</h2>
                  <div className="space-y-3">
                    {sandboxTxHistory.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{tx.description}</p>
                          <p className="text-[11px] text-slate-400">Ref: {tx.reference} · {tx.timestamp}</p>
                        </div>
                        <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800 text-[10px]">
                          {tx.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Log Trail */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-4">System Audit Trail</h2>
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-xl p-3 border border-slate-100 bg-slate-50/50 text-xs">
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#155eef]">
                        {log.eventType}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{log.description}</p>
                        <p className="text-[11px] text-slate-400">{log.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  positive = false,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className={`mt-2 text-xs font-medium ${positive ? "text-emerald-600" : "text-slate-400"}`}>{detail}</p>
    </div>
  );
}
