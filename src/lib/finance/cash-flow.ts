export interface IncomeItem {
  id?: string;
  name: string;
  amount: number;
  frequency: "Monthly" | "Weekly" | "Bi-Weekly" | "Annual";
  isStable: boolean;
  history?: number[];
}

export interface ExpenseItem {
  id?: string;
  description: string;
  amount: number;
  category: string;
  type: "Fixed" | "Flexible";
}

export interface CashFlowMetrics {
  totalIncome: number;
  stableIncome: number;
  variableIncome: number;
  safeConservativeIncome: number;
  totalExpenses: number;
  fixedExpenses: number;
  flexibleExpenses: number;
  monthlySurplus: number;
  savingsRate: number; // percentage (0-100)
  expenseRatio: number; // percentage (0-100)
  incomeVolatilityScore: number; // 0-100 scale (100 = perfectly stable)
}

/**
 * Calculates monthly cash flow metrics deterministically
 */
export function calculateCashFlow(
  incomes: IncomeItem[],
  expenses: ExpenseItem[]
): CashFlowMetrics {
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const stableIncome = incomes
    .filter((item) => item.isStable)
    .reduce((sum, item) => sum + item.amount, 0);
  const variableIncome = incomes
    .filter((item) => !item.isStable)
    .reduce((sum, item) => sum + item.amount, 0);

  // Volatility & conservative safe income estimate for variable income
  let variableSafeEstimate = variableIncome;
  let volatility = 0;

  const variableSourcesWithHistory = incomes.filter(
    (item) => !item.isStable && item.history && item.history.length > 1
  );

  if (variableSourcesWithHistory.length > 0) {
    const allHistories = variableSourcesWithHistory.flatMap(
      (s) => s.history || []
    );
    const mean = allHistories.reduce((a, b) => a + b, 0) / allHistories.length;
    const variance =
      allHistories.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      allHistories.length;
    const stdDev = Math.sqrt(variance);

    // Conservative safe estimate: mean - 0.5 * stdDev (or 80% baseline)
    variableSafeEstimate = Math.max(mean - 0.5 * stdDev, mean * 0.75);
    volatility = Math.min(100, Math.round((stdDev / (mean || 1)) * 100));
  } else if (variableIncome > 0) {
    // Default conservative rule: assume 80% for variable earnings without full history
    variableSafeEstimate = variableIncome * 0.85;
    volatility = 25;
  }

  const safeConservativeIncome = Math.round(stableIncome + variableSafeEstimate);

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const fixedExpenses = expenses
    .filter((item) => item.type === "Fixed")
    .reduce((sum, item) => sum + item.amount, 0);
  const flexibleExpenses = expenses
    .filter((item) => item.type === "Flexible")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlySurplus = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? Math.round((Math.max(monthlySurplus, 0) / totalIncome) * 100) : 0;
  const expenseRatio =
    totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;
  const incomeVolatilityScore = Math.max(0, 100 - volatility);

  return {
    totalIncome,
    stableIncome,
    variableIncome,
    safeConservativeIncome,
    totalExpenses,
    fixedExpenses,
    flexibleExpenses,
    monthlySurplus,
    savingsRate,
    expenseRatio,
    incomeVolatilityScore,
  };
}
