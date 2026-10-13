export interface HealthScoreInput {
  savingsRate: number; // e.g. 20 (for 20%)
  budgetUtilization: number; // e.g. 85 (for 85%)
  debtToIncomeRatio: number; // e.g. 15 (for 15%)
  emergencyFundMonths: number; // e.g. 3.5 months of living expenses
  incomeStabilityScore: number; // 0-100 (where 100 is perfectly stable)
  activeGoalOnTrackRate: number; // 0-100 (percentage of goals on track)
}

export interface HealthScoreComponent {
  name: string;
  score: number;
  maxPoints: number;
  explanation: string;
}

export interface FinancialHealthReport {
  totalScore: number;
  status: "EXCELLENT" | "GOOD" | "FAIR" | "NEEDS_ATTENTION";
  components: HealthScoreComponent[];
  summary: string;
}

/**
 * Calculates deterministic, explainable Financial Health Score (out of 100)
 */
export function calculateFinancialHealthScore(
  input: HealthScoreInput
): FinancialHealthReport {
  // 1. Savings Behavior (Max 25 pts)
  // 20%+ savings rate gets full 25 pts, proportionally scaled
  let savingsScore = 0;
  if (input.savingsRate >= 20) {
    savingsScore = 25;
  } else if (input.savingsRate > 0) {
    savingsScore = Math.round((input.savingsRate / 20) * 25);
  }
  const savingsComp: HealthScoreComponent = {
    name: "Savings behavior",
    score: Math.min(savingsScore, 25),
    maxPoints: 25,
    explanation:
      input.savingsRate >= 20
        ? `Strong savings rate of ${input.savingsRate}%, exceeding the 20% benchmark.`
        : `Current savings rate is ${input.savingsRate}%. Target is at least 20% of monthly income.`,
  };

  // 2. Budget Adherence (Max 20 pts)
  // <= 85% is full 20 pts, 85-100% is 14-19 pts, >100% incurs penalties
  let budgetScore = 20;
  if (input.budgetUtilization > 100) {
    budgetScore = Math.max(0, 20 - Math.round((input.budgetUtilization - 100) * 0.8));
  } else if (input.budgetUtilization > 85) {
    budgetScore = 20 - Math.round(((input.budgetUtilization - 85) / 15) * 6);
  }
  const budgetComp: HealthScoreComponent = {
    name: "Budget adherence",
    score: Math.min(budgetScore, 20),
    maxPoints: 20,
    explanation:
      input.budgetUtilization <= 100
        ? `Spending is within planned budget limits (${input.budgetUtilization}% utilized).`
        : `Category spending has exceeded monthly budgets by ${input.budgetUtilization - 100}%.`,
  };

  // 3. Debt Condition (Max 20 pts)
  // Debt payment <= 15% of income is full 20 pts, >40% drops significantly
  let debtScore = 20;
  if (input.debtToIncomeRatio > 40) {
    debtScore = 5;
  } else if (input.debtToIncomeRatio > 15) {
    debtScore = Math.round(20 - ((input.debtToIncomeRatio - 15) / 25) * 15);
  }
  const debtComp: HealthScoreComponent = {
    name: "Debt condition",
    score: Math.min(debtScore, 20),
    maxPoints: 20,
    explanation:
      input.debtToIncomeRatio <= 15
        ? `Healthy debt burden (${input.debtToIncomeRatio}% of monthly income).`
        : `Debt servicing accounts for ${input.debtToIncomeRatio}% of income. Aim to stay under 20%.`,
  };

  // 4. Emergency Reserve (Max 15 pts)
  // 6 months is full 15 pts
  let emergencyScore = 0;
  if (input.emergencyFundMonths >= 6) {
    emergencyScore = 15;
  } else {
    emergencyScore = Math.round((input.emergencyFundMonths / 6) * 15);
  }
  const emergencyComp: HealthScoreComponent = {
    name: "Emergency reserve",
    score: Math.min(emergencyScore, 15),
    maxPoints: 15,
    explanation:
      input.emergencyFundMonths >= 3
        ? `${input.emergencyFundMonths.toFixed(1)} months of expenses saved in emergency reserves.`
        : `Emergency fund covers only ${input.emergencyFundMonths.toFixed(1)} months. Recommended is 3-6 months.`,
  };

  // 5. Income Stability (Max 10 pts)
  const stabilityScore = Math.round((input.incomeStabilityScore / 100) * 10);
  const stabilityComp: HealthScoreComponent = {
    name: "Income stability",
    score: Math.min(stabilityScore, 10),
    maxPoints: 10,
    explanation:
      input.incomeStabilityScore >= 80
        ? "Predictable, steady monthly cash flow."
        : "Variable income stream detected; conservative spending limits recommended.",
  };

  // 6. Goal Progress (Max 10 pts)
  const goalScore = Math.round((input.activeGoalOnTrackRate / 100) * 10);
  const goalComp: HealthScoreComponent = {
    name: "Goal progress",
    score: Math.min(goalScore, 10),
    maxPoints: 10,
    explanation:
      input.activeGoalOnTrackRate >= 80
        ? "Active financial milestones are on track to meet deadlines."
        : "One or more savings goals face monthly shortfall risks.",
  };

  const components = [
    savingsComp,
    budgetComp,
    debtComp,
    emergencyComp,
    stabilityComp,
    goalComp,
  ];

  const totalScore = components.reduce((sum, c) => sum + c.score, 0);

  let status: FinancialHealthReport["status"] = "FAIR";
  if (totalScore >= 85) status = "EXCELLENT";
  else if (totalScore >= 70) status = "GOOD";
  else if (totalScore >= 50) status = "FAIR";
  else status = "NEEDS_ATTENTION";

  const summary = `Overall financial score is ${totalScore}/100 (${status.replace("_", " ")}). ${
    totalScore >= 70
      ? "Finances are in healthy shape with positive monthly savings."
      : "Focus on reducing flexible spending to increase your monthly cash buffer."
  }`;

  return {
    totalScore,
    status,
    components,
    summary,
  };
}
