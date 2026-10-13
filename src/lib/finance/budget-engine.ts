export interface CategoryBudget {
  category: string;
  limit: number;
  spent: number;
  type: "Fixed" | "Flexible";
}

export interface BudgetStatusItem {
  category: string;
  limit: number;
  spent: number;
  utilizationRate: number; // percentage (0-100+)
  remaining: number;
  isOverspent: boolean;
  type: "Fixed" | "Flexible";
}

export function evaluateBudgets(budgets: CategoryBudget[]): {
  items: BudgetStatusItem[];
  totalBudget: number;
  totalSpent: number;
  overallUtilization: number;
  overspentCategories: string[];
} {
  const items: BudgetStatusItem[] = budgets.map((b) => {
    const rate = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
    const remaining = Math.max(0, b.limit - b.spent);
    return {
      category: b.category,
      limit: b.limit,
      spent: b.spent,
      utilizationRate: rate,
      remaining,
      isOverspent: b.spent > b.limit,
      type: b.type,
    };
  });

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallUtilization =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const overspentCategories = items
    .filter((item) => item.isOverspent)
    .map((item) => item.category);

  return {
    items,
    totalBudget,
    totalSpent,
    overallUtilization,
    overspentCategories,
  };
}
