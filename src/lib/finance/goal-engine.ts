export interface FinancialGoalItem {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthsRemaining: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface GoalAnalysisResult {
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  monthsRemaining: number;
  requiredMonthlySaving: number;
  safeCapacity: number;
  shortfall: number;
  status: "ACHIEVABLE" | "AT_RISK";
  progressPercentage: number;
}

export function analyzeGoal(
  goal: FinancialGoalItem,
  safeMonthlyCapacity: number
): GoalAnalysisResult {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const months = Math.max(1, goal.monthsRemaining);
  const requiredMonthlySaving = Math.round(remainingAmount / months);
  const shortfall = Math.max(0, requiredMonthlySaving - safeMonthlyCapacity);
  const isAchievable = shortfall === 0;
  const progressPercentage =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0;

  return {
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remainingAmount,
    monthsRemaining: months,
    requiredMonthlySaving,
    safeCapacity: safeMonthlyCapacity,
    shortfall,
    status: isAchievable ? "ACHIEVABLE" : "AT_RISK",
    progressPercentage,
  };
}
