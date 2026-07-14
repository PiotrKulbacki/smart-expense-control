import type { Locale } from '@shared/features/i18n';
import type {
  PeriodAggregationSnapshot,
  PeriodCategoryTotalRaw,
} from '@shared/features/analytics/period-aggregation';

export type FinancialContext = {
  currentCycleLabel: string;
  totalSpentThisCycle: number;
  categoryTotals: Array<{ category: string; total: number; currency: string }>;
  recentTransactions: Array<{
    date: string;
    amount: number;
    currency: string;
    category: string;
    description: string | null;
  }>;
};

export type FinancialCycleMeta = {
  todayIso: string;
  financialMonthStartDay: number;
  cycleStartIso: string;
  cycleEndIso: string;
  daysRemainingInCycle: number;
};

export type ActiveMonthlyBudget = {
  amount: number;
  currency: string;
  source: 'current_override' | 'default';
};

export function resolveActiveMonthlyBudget(params: {
  currentMonthBudget: number | null;
  defaultMonthlyBudget: number | null;
  primaryCurrency: string;
}): ActiveMonthlyBudget | null {
  const hasCurrentOverride = params.currentMonthBudget != null && params.currentMonthBudget > 0;
  const amount = hasCurrentOverride ? params.currentMonthBudget : params.defaultMonthlyBudget;

  if (amount == null || amount <= 0) {
    return null;
  }

  return {
    amount,
    currency: params.primaryCurrency,
    source: hasCurrentOverride ? 'current_override' : 'default',
  };
}

export type MonthlyTransactionSnapshot = {
  amount: number;
  currency: string;
  category: string;
};

export type RecentTransactionSnapshot = MonthlyTransactionSnapshot & {
  description: string | null;
  date: Date;
};

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'German',
  pl: 'Polish',
  es: 'Spanish',
};

export function aggregateFinancialContext(
  cycleLabel: string,
  monthlyTransactions: MonthlyTransactionSnapshot[],
  recentTransactions: RecentTransactionSnapshot[]
): FinancialContext {
  const categoryMap = new Map<string, { total: number; currency: string }>();

  for (const transaction of monthlyTransactions) {
    const key = `${transaction.category}::${transaction.currency}`;
    const existing = categoryMap.get(key);

    if (existing) {
      existing.total += transaction.amount;
    } else {
      categoryMap.set(key, { total: transaction.amount, currency: transaction.currency });
    }
  }

  const categoryTotals = Array.from(categoryMap.entries()).map(([key, value]) => {
    const [category] = key.split('::');
    return {
      category,
      total: Math.round(value.total * 100) / 100,
      currency: value.currency,
    };
  });

  const totalSpentThisCycle = monthlyTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  return {
    currentCycleLabel: cycleLabel,
    totalSpentThisCycle: Math.round(totalSpentThisCycle * 100) / 100,
    categoryTotals,
    recentTransactions: recentTransactions.map((transaction) => ({
      date: transaction.date.toISOString().slice(0, 10),
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description,
    })),
  };
}

export function financialContextFromPeriodSnapshot(
  cycleLabel: string,
  snapshot: Pick<PeriodAggregationSnapshot, 'totalSpentRaw' | 'categoryTotalsRaw'>,
  recentTransactions: RecentTransactionSnapshot[]
): FinancialContext {
  return {
    currentCycleLabel: cycleLabel,
    totalSpentThisCycle: snapshot.totalSpentRaw,
    categoryTotals: snapshot.categoryTotalsRaw as PeriodCategoryTotalRaw[],
    recentTransactions: recentTransactions.map((transaction) => ({
      date: transaction.date.toISOString().slice(0, 10),
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description,
    })),
  };
}

function formatBudgetPromptLine(budget: ActiveMonthlyBudget): string {
  const priorityNote =
    budget.source === 'current_override'
      ? 'The user changed this value in the dashboard; it takes priority over general default settings.'
      : 'This is the default monthly budget from user settings (no dashboard override for this cycle).';

  return `User's active monthly budget for the current billing cycle: ${budget.amount} ${budget.currency}. This amount is binding for the current period. ${priorityNote}`;
}

function formatCycleDaysPromptLine(daysRemainingInCycle: number): string {
  const lastDayNote =
    daysRemainingInCycle === 0
      ? ' Today is the last day of the billing cycle — do not divide by zero when computing daily budget limits; treat the full remaining budget as available for today only.'
      : '';

  return `Days remaining until the end of the current billing cycle: ${daysRemainingInCycle}. Use this exact number for all "daily limit" or budget forecasting calculations. Do NOT use fixed values such as 30 or 31 days.${lastDayNote}`;
}

export function buildChatSystemPrompt(
  context: FinancialContext,
  locale: Locale,
  cycleMeta: FinancialCycleMeta,
  activeBudget: ActiveMonthlyBudget | null = null
): string {
  const language = LOCALE_NAMES[locale];
  const budgetSection = activeBudget ? `${formatBudgetPromptLine(activeBudget)}\n\n` : '';

  return `You are a helpful personal finance assistant for Smart Expense Control.
Always respond in ${language}.
Use the user's transaction data below to answer spending questions accurately.
If data is missing, say so clearly and suggest adding transactions.
Never invent transactions or amounts not present in the context.
Keep answers concise, practical, and friendly.

Today is ${cycleMeta.todayIso}. User's financial cycle starts on day ${cycleMeta.financialMonthStartDay}.
Current cycle: ${cycleMeta.cycleStartIso} to ${cycleMeta.cycleEndIso}. Use this range to calculate averages or statistics.
${formatCycleDaysPromptLine(cycleMeta.daysRemainingInCycle)}

${budgetSection}Current cycle label: ${context.currentCycleLabel}
Total spent this cycle (all currencies, not converted): ${context.totalSpentThisCycle}

Category totals this cycle:
${context.categoryTotals.length > 0 ? JSON.stringify(context.categoryTotals, null, 2) : 'No transactions this month.'}

Recent transactions (newest first):
${context.recentTransactions.length > 0 ? JSON.stringify(context.recentTransactions, null, 2) : 'No transactions on record.'}`;
}
