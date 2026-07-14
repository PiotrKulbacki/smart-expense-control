import { endOfDay, startOfDay } from 'date-fns';
import { prisma } from '@smart-expense-control/database';
import { getQuotaPeriodStart } from '@shared/features/billing/financial-month';
import { convertAmount } from '@shared/features/currency';
import { getInclusiveTransactionPeriodEnd } from '@shared/features/transactions/calendar-date';
import { FIXED_COSTS_CATEGORY } from '@shared/features/transactions/fixed-costs';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { getExchangeRates } from '@web/features/currency/services/currency.service';
import { getChartDataFetchStart } from '@web/features/transactions/lib/chart-date-filter';
import { getOrRefreshPeriodAggregation } from '@web/features/analytics/services/period-aggregation-cache.service';

export type DashboardTransaction = {
  id: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: string;
  description: string | null;
  date: string;
  isAiScanned: boolean;
};

export type DashboardChartTransaction = {
  date: string;
  category: string;
  convertedAmount: number;
};

export type DashboardSummary = {
  primaryCurrency: CurrencyCode;
  financialMonthStartDay: number;
  periodStart: string;
  periodEnd: string;
  totalSpent: number;
  billingPeriodTotalSpent: number;
  fixedCostsTotal: number;
  transactionCount: number;
  categoryTotals: Array<{ category: string; amount: number }>;
  currentMonthBudget: number | null;
  defaultMonthlyBudget: number | null;
};

export type DashboardData = {
  summary: DashboardSummary;
  recentTransactions: DashboardTransaction[];
  chartTransactions: DashboardChartTransaction[];
};

export type DashboardDateRange = {
  from?: Date;
  to?: Date;
};

function parseDateParam(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export function parseDashboardDateRange(searchParams: URLSearchParams): DashboardDateRange {
  const from = parseDateParam(searchParams.get('from'));
  const to = parseDateParam(searchParams.get('to'));

  if (!from && !to) {
    return {};
  }

  return { from, to };
}

async function getFixedCostsTotal(
  userId: string,
  primaryCurrency: CurrencyCode,
  rateMap: Awaited<ReturnType<typeof getExchangeRates>>
): Promise<number> {
  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: { userId, isActive: true },
    select: { amount: true, currency: true },
  });

  let total = 0;

  for (const expense of recurringExpenses) {
    total += convertAmount(
      expense.amount.toNumber(),
      expense.currency as CurrencyCode,
      primaryCurrency,
      rateMap
    );
  }

  return Math.round(total * 100) / 100;
}

function appendFixedCostsCategory(
  categoryTotals: Array<{ category: string; amount: number }>,
  fixedCostsTotal: number
): Array<{ category: string; amount: number }> {
  if (fixedCostsTotal <= 0) {
    return categoryTotals;
  }

  const totals = [...categoryTotals];
  const existingIndex = totals.findIndex((item) => item.category === FIXED_COSTS_CATEGORY);

  if (existingIndex >= 0) {
    totals[existingIndex] = {
      category: FIXED_COSTS_CATEGORY,
      amount: Math.round((totals[existingIndex].amount + fixedCostsTotal) * 100) / 100,
    };
  } else {
    totals.push({ category: FIXED_COSTS_CATEGORY, amount: fixedCostsTotal });
  }

  return totals.sort((a, b) => b.amount - a.amount);
}

export async function getDashboardData(
  userId: string,
  dateRange: DashboardDateRange = {}
): Promise<DashboardData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryCurrency: true,
      financialMonthStartDay: true,
      defaultMonthlyBudget: true,
      currentMonthBudget: true,
    },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  const defaultPeriodStart = getQuotaPeriodStart(user.financialMonthStartDay, now);
  const periodStart = dateRange.from ? startOfDay(dateRange.from) : defaultPeriodStart;
  const periodEnd = dateRange.to ? endOfDay(dateRange.to) : getInclusiveTransactionPeriodEnd(now);
  const chartDataStart = getChartDataFetchStart(periodStart, periodEnd);
  const primaryCurrency = user.primaryCurrency as CurrencyCode;
  const rateMap = await getExchangeRates();
  const usesDefaultPeriod = !dateRange.from && !dateRange.to;

  const [
    periodTransactions,
    chartSourceTransactions,
    recentTransactions,
    fixedCostsTotal,
    cachedPeriodAggregation,
  ] = await Promise.all([
    usesDefaultPeriod
      ? Promise.resolve([])
      : prisma.transaction.findMany({
          where: {
            userId,
            date: { gte: periodStart, lte: periodEnd },
          },
          select: {
            amount: true,
            currency: true,
            category: true,
          },
        }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: chartDataStart, lte: periodEnd },
      },
      select: {
        amount: true,
        currency: true,
        category: true,
        date: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: defaultPeriodStart, lte: periodEnd },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        category: true,
        description: true,
        date: true,
        isAiScanned: true,
      },
    }),
    usesDefaultPeriod ? Promise.resolve(0) : getFixedCostsTotal(userId, primaryCurrency, rateMap),
    getOrRefreshPeriodAggregation(userId, now),
  ]);

  const billingPeriodTotalSpent =
    cachedPeriodAggregation != null
      ? cachedPeriodAggregation.totalSpentPrimary + cachedPeriodAggregation.fixedCostsTotal
      : fixedCostsTotal;

  const categoryMap = new Map<string, number>();
  let totalSpent = 0;
  let transactionCount = 0;
  let categoryTotals: Array<{ category: string; amount: number }>;
  const resolvedFixedCostsTotal =
    usesDefaultPeriod && cachedPeriodAggregation
      ? cachedPeriodAggregation.fixedCostsTotal
      : fixedCostsTotal;

  if (usesDefaultPeriod && cachedPeriodAggregation) {
    totalSpent = billingPeriodTotalSpent;
    transactionCount = cachedPeriodAggregation.transactionCount;
    categoryTotals = cachedPeriodAggregation.categoryTotalsPrimary;
  } else {
    for (const transaction of periodTransactions) {
      const amount = transaction.amount.toNumber();
      const converted = convertAmount(
        amount,
        transaction.currency as CurrencyCode,
        primaryCurrency,
        rateMap
      );
      totalSpent += converted;
      categoryMap.set(
        transaction.category,
        (categoryMap.get(transaction.category) ?? 0) + converted
      );
    }

    categoryTotals = appendFixedCostsCategory(
      Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount),
      resolvedFixedCostsTotal
    );

    totalSpent += resolvedFixedCostsTotal;
    transactionCount = periodTransactions.length;
  }

  const chartTransactions: DashboardChartTransaction[] = chartSourceTransactions.map(
    (transaction) => {
      const amount = transaction.amount.toNumber();
      return {
        date: transaction.date.toISOString(),
        category: transaction.category,
        convertedAmount: convertAmount(
          amount,
          transaction.currency as CurrencyCode,
          primaryCurrency,
          rateMap
        ),
      };
    }
  );

  if (resolvedFixedCostsTotal > 0) {
    chartTransactions.push({
      date: periodStart.toISOString(),
      category: FIXED_COSTS_CATEGORY,
      convertedAmount: resolvedFixedCostsTotal,
    });
  }

  return {
    summary: {
      primaryCurrency,
      financialMonthStartDay: user.financialMonthStartDay,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalSpent: Math.round(totalSpent * 100) / 100,
      billingPeriodTotalSpent: Math.round(billingPeriodTotalSpent * 100) / 100,
      fixedCostsTotal: Math.round(resolvedFixedCostsTotal * 100) / 100,
      transactionCount,
      categoryTotals,
      currentMonthBudget: user.currentMonthBudget,
      defaultMonthlyBudget: user.defaultMonthlyBudget,
    },
    recentTransactions: recentTransactions.map((transaction) => {
      const amount = transaction.amount.toNumber();
      return {
        id: transaction.id,
        amount,
        currency: transaction.currency,
        convertedAmount: convertAmount(
          amount,
          transaction.currency as CurrencyCode,
          primaryCurrency,
          rateMap
        ),
        category: transaction.category,
        description: transaction.description,
        date: transaction.date.toISOString(),
        isAiScanned: transaction.isAiScanned,
      };
    }),
    chartTransactions,
  };
}
