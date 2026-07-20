import type { Locale } from '@shared/features/i18n';
import type {
  PeriodAggregationSnapshot,
  PeriodCategoryTotalPrimary,
  PeriodCategoryTotalRaw,
} from '@shared/features/analytics/period-aggregation';
import { computeDailyBudgetStats } from '@web/features/dashboard/lib/dashboard-daily-stats';

export type DashboardBudgetSummary = {
  primaryCurrency: string;
  transactionsSpentPrimary: number;
  fixedCostsTotal: number;
  totalSpentIncludingFixed: number;
  remainingBudget: number | null;
  daysElapsed: number;
  daysUntilPayday: number;
  avgSpentPerDay: number;
  avgRemainingPerDay: number | null;
  cycleEnded: boolean;
  categoryTotalsPrimary: PeriodCategoryTotalPrimary[];
};

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
  budgetSummary: DashboardBudgetSummary | null;
  categoryLimits: Array<{
    category: string;
    limitAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentage: number;
    isOverLimit: boolean;
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

export function buildDashboardBudgetSummary(params: {
  snapshot: PeriodAggregationSnapshot;
  currentMonthBudget: number | null;
  daysElapsed: number;
  daysUntilPayday: number;
}): DashboardBudgetSummary {
  const totalSpentIncludingFixed =
    params.snapshot.totalSpentPrimary + params.snapshot.fixedCostsTotal;
  const dailyStats = computeDailyBudgetStats({
    visibleTotalSpent: totalSpentIncludingFixed,
    hiddenTotalSpent: 0,
    currentMonthBudget: params.currentMonthBudget,
    daysElapsed: params.daysElapsed,
    daysUntilPayday: params.daysUntilPayday,
  });

  const remainingBudget =
    params.currentMonthBudget != null && params.currentMonthBudget > 0
      ? Math.max(params.currentMonthBudget - totalSpentIncludingFixed, 0)
      : null;

  return {
    primaryCurrency: params.snapshot.primaryCurrency,
    transactionsSpentPrimary: params.snapshot.totalSpentPrimary,
    fixedCostsTotal: params.snapshot.fixedCostsTotal,
    totalSpentIncludingFixed,
    remainingBudget,
    daysElapsed: params.daysElapsed,
    daysUntilPayday: params.daysUntilPayday,
    avgSpentPerDay: dailyStats.avgSpentPerDay,
    avgRemainingPerDay: dailyStats.avgRemainingPerDay,
    cycleEnded: dailyStats.cycleEnded,
    categoryTotalsPrimary: params.snapshot.categoryTotalsPrimary,
  };
}

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
    budgetSummary: null,
    categoryLimits: [],
  };
}

export function financialContextFromPeriodSnapshot(
  cycleLabel: string,
  snapshot: PeriodAggregationSnapshot,
  recentTransactions: RecentTransactionSnapshot[],
  budgetParams: {
    currentMonthBudget: number | null;
    daysElapsed: number;
    daysUntilPayday: number;
  },
  categoryLimits: FinancialContext['categoryLimits'] = []
): FinancialContext {
  return {
    currentCycleLabel: cycleLabel,
    totalSpentThisCycle: snapshot.totalSpentPrimary + snapshot.fixedCostsTotal,
    categoryTotals: snapshot.categoryTotalsRaw as PeriodCategoryTotalRaw[],
    recentTransactions: recentTransactions.map((transaction) => ({
      date: transaction.date.toISOString().slice(0, 10),
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description,
    })),
    budgetSummary: buildDashboardBudgetSummary({
      snapshot,
      currentMonthBudget: budgetParams.currentMonthBudget,
      daysElapsed: budgetParams.daysElapsed,
      daysUntilPayday: budgetParams.daysUntilPayday,
    }),
    categoryLimits,
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
    daysRemainingInCycle === 0 ? ' Today is the last day of the billing cycle.' : '';

  return `Days remaining until the end of the current billing cycle: ${daysRemainingInCycle}.${lastDayNote} Do NOT use fixed values such as 30 or 31 days when counting cycle length.`;
}

function formatDashboardBudgetSummarySection(summary: DashboardBudgetSummary): string {
  const dailyAllowance =
    summary.avgRemainingPerDay != null
      ? `${summary.avgRemainingPerDay} ${summary.primaryCurrency}/day`
      : 'not available (no budget set or cycle ended)';

  return `Dashboard budget summary (authoritative — matches the "Total spent" panel):
${JSON.stringify(summary, null, 2)}

CRITICAL DEFAULTS — apply automatically without the user asking:
- Any question about "daily budget", "how much left per day", "money for living", or "can I afford X" MUST use totalSpentIncludingFixed and remainingBudget. Fixed costs (fixedCostsTotal) are ALREADY included — never answer using transactionsSpentPrimary alone.
- The current daily allowance is avgRemainingPerDay (${dailyAllowance}), derived from remainingBudget / daysUntilPayday. Prefer citing this value when the user asks how much they can spend per day today.

Budget calculation rules:
- totalSpentIncludingFixed = transactionsSpentPrimary + fixedCostsTotal. This is the only correct "spent so far" figure.
- remainingBudget = budget - totalSpentIncludingFixed. Use this as the starting point for all forecasts.
- Daily allowance = remainingBudget / daysUntilPayday (NOT daysRemainingInCycle). Current value: avgRemainingPerDay.

Hypothetical purchase rules (e.g. "if I buy shoes for 160 EUR"):
- A planned purchase REDUCES remaining budget: newRemaining = remainingBudget - purchaseAmount.
- NEVER add the purchase amount to remainingBudget or to the daily allowance — buying something means LESS money left, not more.
- newDailyAllowance = newRemaining / daysUntilPayday.
- Worked example with current data: purchase 160 ${summary.primaryCurrency} → newRemaining = ${summary.remainingBudget ?? 0} - 160 = ${summary.remainingBudget != null ? Math.max(summary.remainingBudget - 160, 0) : 'N/A'}; newDaily = newRemaining / ${summary.daysUntilPayday}.
- If daysUntilPayday is 0, the cycle has ended — do not divide by zero; treat remaining budget as available today only.`;
}

export function buildChatSystemPrompt(
  context: FinancialContext,
  locale: Locale,
  cycleMeta: FinancialCycleMeta,
  activeBudget: ActiveMonthlyBudget | null = null
): string {
  const language = LOCALE_NAMES[locale];
  const budgetSection = activeBudget ? `${formatBudgetPromptLine(activeBudget)}\n\n` : '';
  const dashboardSummarySection = context.budgetSummary
    ? `${formatDashboardBudgetSummarySection(context.budgetSummary)}\n\n`
    : '';

  const spentLine = context.budgetSummary
    ? `Total spent this cycle in ${context.budgetSummary.primaryCurrency} (transactions + fixed costs): ${context.budgetSummary.totalSpentIncludingFixed}`
    : `Total spent this cycle (all currencies, not converted): ${context.totalSpentThisCycle}`;

  const categorySection = context.budgetSummary
    ? `Category totals this cycle (${context.budgetSummary.primaryCurrency}, includes fixed costs):
${context.budgetSummary.categoryTotalsPrimary.length > 0 ? JSON.stringify(context.budgetSummary.categoryTotalsPrimary, null, 2) : 'No spending this cycle.'}`
    : `Category totals this cycle:
${context.categoryTotals.length > 0 ? JSON.stringify(context.categoryTotals, null, 2) : 'No transactions this month.'}`;

  const categoryLimitsSection =
    context.categoryLimits.length > 0
      ? `Category spending limits for this cycle (authoritative — matches dashboard progress bars):
${JSON.stringify(context.categoryLimits, null, 2)}

When the user asks about category budgets or limits, use these values. percentage may exceed 100 when over limit; isOverLimit marks categories past their cap.`
      : '';

  return `You are a helpful personal finance assistant for Lyamo.
Always respond in ${language}.
Use the user's transaction data below to answer spending questions accurately.
If data is missing, say so clearly and suggest adding transactions.
Never invent transactions or amounts not present in the context.
Keep answers concise, practical, and friendly.
${context.budgetSummary ? '\nFor budget and daily spending questions, always use the Dashboard budget summary below — it already includes fixed costs. Do not recalculate from recent transactions or transactionsSpentPrimary alone.' : ''}

Today is ${cycleMeta.todayIso}. User's financial cycle starts on day ${cycleMeta.financialMonthStartDay}.
Current cycle: ${cycleMeta.cycleStartIso} to ${cycleMeta.cycleEndIso}. Use this range to calculate averages or statistics.
${formatCycleDaysPromptLine(cycleMeta.daysRemainingInCycle)}

${budgetSection}${dashboardSummarySection}${spentLine}

${categorySection}
${categoryLimitsSection ? `\n${categoryLimitsSection}\n` : ''}
Recent transactions (newest first):
${context.recentTransactions.length > 0 ? JSON.stringify(context.recentTransactions, null, 2) : 'No transactions on record.'}`;
}
