"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface IncomeFormItem {
  name: string;
  type: string;
  amount: number;
  frequency: string;
  isStable: boolean;
  history: string;
}

interface ExpenseFormItem {
  name: string;
  category: string;
  amount: number;
  minAllowed?: number;
}

interface DebtFormItem {
  name: string;
  outstandingAmount: number;
  monthlyPayment: number;
  interestRate?: number;
  dueDate?: string;
}

interface BillFormItem {
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  isRecurring: boolean;
}

interface GoalFormItem {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [reportData, setReportData] = useState<{
    cashFlow: {
      totalIncome: number;
      fixedExpenses: number;
      flexibleExpenses: number;
      totalExpenses: number;
      monthlySurplus: number;
      savingsRate: number;
      incomeVolatilityScore: number;
    };
    healthScore: {
      totalScore: number;
      status: string;
      summary: string;
    };
    primaryGoalAnalysis?: {
      name: string;
      targetAmount: number;
      requiredMonthlySaving: number;
      safeCapacity: number;
      shortfall: number;
      status: string;
    } | null;
  } | null>(null);

  // Step 1: Overview
  const [currency, setCurrency] = useState("BDT (৳)");
  const [employmentType, setEmploymentType] = useState("Job + Freelancer");

  // Step 2: Incomes
  const [incomes, setIncomes] = useState<IncomeFormItem[]>([
    { name: "", type: "Salary", amount: 0, frequency: "Monthly", isStable: true, history: "" },
  ]);

  // Step 3: Fixed Expenses
  const [fixedExpenses, setFixedExpenses] = useState<ExpenseFormItem[]>([
    { name: "", category: "Housing", amount: 0 },
  ]);

  // Step 4: Flexible Expenses
  const [flexibleExpenses, setFlexibleExpenses] = useState<ExpenseFormItem[]>([
    { name: "", category: "Flexible", amount: 0, minAllowed: 0 },
  ]);

  // Step 5: Savings & Debt
  const [currentSavings, setCurrentSavings] = useState(0);
  const [emergencyFund, setEmergencyFund] = useState(0);
  const [hasNoDebt, setHasNoDebt] = useState(true);
  const [debts] = useState<DebtFormItem[]>([]);

  // Step 6: Bills
  const [bills, setBills] = useState<BillFormItem[]>([]);

  // Step 7: Goals
  const [goals, setGoals] = useState<GoalFormItem[]>([
    { name: "", targetAmount: 0, currentAmount: 0, deadline: "", priority: "HIGH" },
  ]);

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 7));
  const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // Submit and analyze
  const handleAnalyzeFinances = async () => {
    try {
      setSubmitting(true);
      const payload = {
        currency,
        employmentType,
        incomes: incomes.map((inc) => ({
          ...inc,
          history: inc.history ? inc.history.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n)) : [],
        })),
        fixedExpenses,
        flexibleExpenses,
        savings: { currentSavings, emergencyFund },
        debts: hasNoDebt ? [] : debts,
        bills,
        goals,
      };

      const res = await fetch("/api/finance/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.report) {
        setReportData(data.report);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // If Personalized Report is ready (Section 9)
  if (reportData) {
    const cf = reportData.cashFlow;
    const hs = reportData.healthScore;
    const goal = reportData.primaryGoalAnalysis;

    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#155eef]">
              ✦ Financial Analysis Complete
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Your Financial Profile is Ready</h1>
            <p className="mt-1 text-xs text-slate-500">
              Deterministic calculations based on your income, expenses, and goals.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Monthly Income</span>
              <span className="font-bold text-slate-900">৳{cf.totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Fixed Expenses</span>
              <span className="font-bold text-slate-900">৳{cf.fixedExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Flexible Expenses</span>
              <span className="font-bold text-slate-900">৳{cf.flexibleExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Total Monthly Expenses</span>
              <span className="font-bold text-slate-900">৳{cf.totalExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Monthly Surplus</span>
              <span className="font-bold text-emerald-600">৳{cf.monthlySurplus.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Savings Rate</span>
              <span className="font-bold text-slate-900">{cf.savingsRate}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Financial Health Score</span>
              <span className="font-bold text-[#155eef]">{hs.totalScore} / 100 ({hs.status})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-600">Income Stability</span>
              <span className="font-bold text-slate-900">
                {cf.incomeVolatilityScore > 80 ? "LOW VOLATILITY (STABLE)" : "MODERATE VOLATILITY"}
              </span>
            </div>
          </div>

          {/* Goal Analysis */}
          {goal && (
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Primary Goal: {goal.name} (৳{goal.targetAmount.toLocaleString()})</span>
                <span className={`rounded-md px-2 py-0.5 font-bold ${goal.status === "ACHIEVABLE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {goal.status}
                </span>
              </div>
              <p className="mt-2 text-slate-600 leading-5">
                Required saving: <strong>৳{goal.requiredMonthlySaving.toLocaleString()}/mo</strong>. Current safe capacity: <strong>৳{goal.safeCapacity.toLocaleString()}/mo</strong>.
                {goal.shortfall > 0 && <span className="ml-1 text-amber-700 font-semibold">Shortfall: ৳{goal.shortfall.toLocaleString()}/mo.</span>}
              </p>
            </div>
          )}

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-8 w-full rounded-xl bg-[#155eef] py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Go to Dashboard →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Progress Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#155eef]">
              Step {currentStep} of 7
            </span>
            <h1 className="text-xl font-extrabold text-slate-900">
              {currentStep === 1 && "Personal Financial Overview"}
              {currentStep === 2 && "Income Sources"}
              {currentStep === 3 && "Fixed Expenses"}
              {currentStep === 4 && "Flexible Expenses"}
              {currentStep === 5 && "Savings & Debt"}
              {currentStep === 6 && "Recurring Bills"}
              {currentStep === 7 && "Financial Goals"}
            </h1>
          </div>
          <div className="text-xs font-bold text-slate-400">
            {Math.round((currentStep / 7) * 100)}%
          </div>
        </div>

        {/* Step 1: Overview */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700">Preferred Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 font-medium"
              >
                <option value="BDT (৳)">BDT (৳) — Bangladeshi Taka</option>
                <option value="USD ($)">USD ($) — US Dollar</option>
                <option value="EUR (€)">EUR (€) — Euro</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 font-medium"
              >
                <option value="Job">Salaried Job</option>
                <option value="Freelancer">Freelancer / Contract</option>
                <option value="Job + Freelancer">Job + Freelancer (Hybrid)</option>
                <option value="Business">Business Owner</option>
                <option value="Student">Student (Allowance)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Income Sources */}
        {currentStep === 2 && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-500">Add your regular and freelance income sources:</p>
            {incomes.map((inc, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Source #{i + 1}</span>
                  {incomes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIncomes(incomes.filter((_, idx) => idx !== i))}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={inc.name}
                    onChange={(e) => {
                      const next = [...incomes];
                      next[i].name = e.target.value;
                      setIncomes(next);
                    }}
                    placeholder="Source Name (e.g. Salary, Client)"
                    className="rounded-lg border border-slate-200 bg-white p-2"
                  />
                  <input
                    type="number"
                    value={inc.amount || ""}
                    onChange={(e) => {
                      const next = [...incomes];
                      next[i].amount = parseFloat(e.target.value) || 0;
                      setIncomes(next);
                    }}
                    placeholder="Monthly Amount"
                    className="rounded-lg border border-slate-200 bg-white p-2"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={inc.isStable}
                      onChange={(e) => {
                        const next = [...incomes];
                        next[i].isStable = e.target.checked;
                        setIncomes(next);
                      }}
                    />
                    <span>Stable income (Predictable)</span>
                  </label>
                </div>
                {!inc.isStable && (
                  <div>
                    <label className="text-[11px] text-slate-500">Recent monthly history (for volatility analysis):</label>
                    <input
                      type="text"
                      value={inc.history}
                      onChange={(e) => {
                        const next = [...incomes];
                        next[i].history = e.target.value;
                        setIncomes(next);
                      }}
                      placeholder="e.g. 42000, 55000, 31000, 60000"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-[11px]"
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => setIncomes([...incomes, { name: "", type: "Salary", amount: 0, frequency: "Monthly", isStable: true, history: "" }])}
              className="text-xs font-bold text-[#155eef]"
            >
              + Add Another Income Source
            </button>
          </div>
        )}

        {/* Step 3: Fixed Expenses */}
        {currentStep === 3 && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-500">Essential expenses that cannot be easily cut:</p>
            {fixedExpenses.map((exp, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={exp.name}
                  placeholder="Expense Name (e.g. Rent, Internet)"
                  onChange={(e) => {
                    const next = [...fixedExpenses];
                    next[i].name = e.target.value;
                    setFixedExpenses(next);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 p-2"
                />
                <input
                  type="number"
                  value={exp.amount || ""}
                  placeholder="Monthly Amount"
                  onChange={(e) => {
                    const next = [...fixedExpenses];
                    next[i].amount = parseFloat(e.target.value) || 0;
                    setFixedExpenses(next);
                  }}
                  className="w-32 rounded-lg border border-slate-200 p-2"
                />
                {fixedExpenses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setFixedExpenses(fixedExpenses.filter((_, idx) => idx !== i))}
                    className="px-2 py-1 text-xs font-bold text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setFixedExpenses([...fixedExpenses, { name: "", category: "Housing", amount: 0 }])}
              className="text-xs font-bold text-[#155eef]"
            >
              + Add Fixed Expense
            </button>
          </div>
        )}

        {/* Step 4: Flexible Expenses */}
        {currentStep === 4 && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-500">Expenses that can be adjusted to achieve your goals:</p>
            {flexibleExpenses.map((exp, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Item #{i + 1}</span>
                  {flexibleExpenses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFlexibleExpenses(flexibleExpenses.filter((_, idx) => idx !== i))}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exp.name}
                    placeholder="Expense Name (e.g. Dining, Outings)"
                    onChange={(e) => {
                      const next = [...flexibleExpenses];
                      next[i].name = e.target.value;
                      setFlexibleExpenses(next);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 bg-white p-2"
                  />
                  <input
                    type="number"
                    value={exp.amount || ""}
                    placeholder="Monthly Amount"
                    onChange={(e) => {
                      const next = [...flexibleExpenses];
                      next[i].amount = parseFloat(e.target.value) || 0;
                      setFlexibleExpenses(next);
                    }}
                    className="w-32 rounded-lg border border-slate-200 bg-white p-2"
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>Minimum protected limit:</span>
                  <input
                    type="number"
                    value={exp.minAllowed || ""}
                    placeholder="Min limit"
                    onChange={(e) => {
                      const next = [...flexibleExpenses];
                      next[i].minAllowed = parseFloat(e.target.value) || 0;
                      setFlexibleExpenses(next);
                    }}
                    className="w-24 rounded border border-slate-200 bg-white p-1 text-[11px]"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => setFlexibleExpenses([...flexibleExpenses, { name: "", category: "Flexible", amount: 0, minAllowed: 0 }])}
              className="text-xs font-bold text-[#155eef]"
            >
              + Add Flexible Expense
            </button>
          </div>
        )}

        {/* Step 5: Savings & Debt */}
        {currentStep === 5 && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700">Current Total Savings (৳)</label>
                <input
                  type="number"
                  value={currentSavings || ""}
                  placeholder="0"
                  onChange={(e) => setCurrentSavings(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700">Emergency Fund (৳)</label>
                <input
                  type="number"
                  value={emergencyFund || ""}
                  placeholder="0"
                  onChange={(e) => setEmergencyFund(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={hasNoDebt}
                  onChange={(e) => setHasNoDebt(e.target.checked)}
                />
                <span>I currently have no debt</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 6: Bills */}
        {currentStep === 6 && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-500">Recurring utility and subscription bills:</p>
            {bills.length === 0 && <p className="text-slate-400 italic">No recurring bills added yet.</p>}
            {bills.map((bill, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={bill.name}
                  placeholder="Bill Name (e.g. Internet, Electricity)"
                  onChange={(e) => {
                    const next = [...bills];
                    next[i].name = e.target.value;
                    setBills(next);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 p-2"
                />
                <input
                  type="number"
                  value={bill.amount || ""}
                  placeholder="Amount"
                  onChange={(e) => {
                    const next = [...bills];
                    next[i].amount = parseFloat(e.target.value) || 0;
                    setBills(next);
                  }}
                  className="w-28 rounded-lg border border-slate-200 p-2"
                />
                <button
                  type="button"
                  onClick={() => setBills(bills.filter((_, idx) => idx !== i))}
                  className="px-2 py-1 text-xs font-bold text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
            <div>
              <button
                onClick={() => setBills([...bills, { name: "", amount: 0, dueDate: "2026-10-25", category: "Utilities", isRecurring: true }])}
                className="text-xs font-bold text-[#155eef]"
              >
                + Add Recurring Bill
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Goals */}
        {currentStep === 7 && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-500">What major purchase or fund are you saving for?</p>
            {goals.map((g, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Goal #{i + 1}</span>
                  {goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setGoals(goals.filter((_, idx) => idx !== i))}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={g.name}
                    onChange={(e) => {
                      const next = [...goals];
                      next[i].name = e.target.value;
                      setGoals(next);
                    }}
                    placeholder="Goal Name (e.g. Laptop)"
                    className="rounded-lg border border-slate-200 bg-white p-2"
                  />
                  <input
                    type="number"
                    value={g.targetAmount || ""}
                    onChange={(e) => {
                      const next = [...goals];
                      next[i].targetAmount = parseFloat(e.target.value) || 0;
                      setGoals(next);
                    }}
                    placeholder="Target Amount (৳)"
                    className="rounded-lg border border-slate-200 bg-white p-2"
                  />
                </div>
              </div>
            ))}
            <div>
              <button
                onClick={() => setGoals([...goals, { name: "", targetAmount: 0, currentAmount: 0, deadline: "", priority: "HIGH" }])}
                className="text-xs font-bold text-[#155eef]"
              >
                + Add Another Goal
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between border-t border-slate-100 pt-4">
          {currentStep > 1 ? (
            <button
              onClick={handlePrev}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ← Previous
            </button>
          ) : <div />}

          {currentStep < 7 ? (
            <button
              onClick={handleNext}
              className="rounded-xl bg-[#155eef] px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleAnalyzeFinances}
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs disabled:opacity-50"
            >
              {submitting ? "Analyzing..." : "Analyze My Finances ✦"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
