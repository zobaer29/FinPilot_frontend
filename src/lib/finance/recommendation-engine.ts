export interface CategoryReduction {
  category: string;
  currentSpending: number;
  recommendedReduction: number;
  newSpending: number;
}

export interface RecommendationPlan {
  problemType: string;
  summary: string;
  explanation: string;
  requiredMonthlySavings: number;
  initialSafeCapacity: number;
  shortfall: number;
  totalRecovered: number;
  newSafeCapacity: number;
  isGoalAchievableNow: boolean;
  adjustments: CategoryReduction[];
  proposedActions: {
    type: "UPDATE_BUDGET" | "ALLOCATE_SANDBOX_SAVINGS" | "ENABLE_ALERT";
    description: string;
    payload: Record<string, unknown>;
  }[];
}

/**
 * Generates an explainable financial adjustment plan to close goal shortfall
 */
export function generateGoalRecommendation(params: {
  goalName: string;
  targetAmount: number;
  monthsRemaining: number;
  safeCapacity: number;
  flexibleCategories: { category: string; amount: number; minAllowed: number }[];
}): RecommendationPlan {
  const { goalName, targetAmount, monthsRemaining, safeCapacity, flexibleCategories } = params;
  const requiredMonthlySavings = Math.round(targetAmount / Math.max(1, monthsRemaining));
  const shortfall = Math.max(0, requiredMonthlySavings - safeCapacity);

  const adjustments: CategoryReduction[] = [];
  let remainingShortfallToCover = shortfall;

  // Prioritize categories with the largest flexible margin
  const sorted = [...flexibleCategories].sort(
    (a, b) => b.amount - b.minAllowed - (a.amount - a.minAllowed)
  );

  for (const item of sorted) {
    if (remainingShortfallToCover <= 0) break;
    const maxCut = Math.max(0, item.amount - item.minAllowed);
    if (maxCut <= 0) continue;

    const cut = Math.min(maxCut, remainingShortfallToCover);
    adjustments.push({
      category: item.category,
      currentSpending: item.amount,
      recommendedReduction: cut,
      newSpending: item.amount - cut,
    });
    remainingShortfallToCover -= cut;
  }

  const totalRecovered = adjustments.reduce((sum, a) => sum + a.recommendedReduction, 0);
  const newSafeCapacity = safeCapacity + totalRecovered;
  const isGoalAchievableNow = newSafeCapacity >= requiredMonthlySavings;

  const explanation =
    shortfall > 0
      ? `Your ${goalName} goal requires ৳${requiredMonthlySavings.toLocaleString()} per month, but your current safe capacity is ৳${safeCapacity.toLocaleString()} (shortfall: ৳${shortfall.toLocaleString()}). By safely trimming flexible expenses by ৳${totalRecovered.toLocaleString()} while protecting essential needs, your monthly capacity increases to ৳${newSafeCapacity.toLocaleString()}, making your goal achievable.`
      : `Your current monthly safe saving capacity of ৳${safeCapacity.toLocaleString()} fully covers the required ৳${requiredMonthlySavings.toLocaleString()} monthly goal contribution.`;

  const proposedActions: RecommendationPlan["proposedActions"] = adjustments.map((adj) => ({
    type: "UPDATE_BUDGET",
    description: `Adjust ${adj.category} budget from ৳${adj.currentSpending.toLocaleString()} to ৳${adj.newSpending.toLocaleString()}`,
    payload: { category: adj.category, newLimit: adj.newSpending },
  }));

  proposedActions.push({
    type: "ALLOCATE_SANDBOX_SAVINGS",
    description: `Allocate ৳${requiredMonthlySavings.toLocaleString()} monthly from Available Balance to ${goalName} Fund`,
    payload: { goalName, amount: requiredMonthlySavings },
  });

  proposedActions.push({
    type: "ENABLE_ALERT",
    description: `Enable real-time overspending alerts for flexible categories`,
    payload: { categories: adjustments.map((a) => a.category) },
  });

  return {
    problemType: "GOAL_PLANNING",
    summary: `Personalized plan to achieve ${goalName} within ${monthsRemaining} months`,
    explanation,
    requiredMonthlySavings,
    initialSafeCapacity: safeCapacity,
    shortfall,
    totalRecovered,
    newSafeCapacity,
    isGoalAchievableNow,
    adjustments,
    proposedActions,
  };
}
