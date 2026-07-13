import { prisma } from '@smart-expense-control/database';
import { getQuotaPeriodStart } from '@shared/features/billing/financial-month';
import { convertAmount } from '@shared/features/currency';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { getExchangeRates } from '@web/features/currency/services/currency.service';
import { getChartDataFetchStart } from '@web/features/transactions/lib/chart-date-filter';

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
  transactionCount: number;
  categoryTotals: Array<{ category: string; amount: number }>;
};

export type DashboardData = {
  summary: DashboardSummary;
  recentTransactions: DashboardTransaction[];
  chartTransactions: DashboardChartTransaction[];
};

export async function getDashboardData(userId: string): Promise<DashboardData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryCurrency: true,
      financialMonthStartDay: true,
    },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  const periodStart = getQuotaPeriodStart(user.financialMonthStartDay, now);
  const chartDataStart = getChartDataFetchStart(periodStart, now);
  const primaryCurrency = user.primaryCurrency as CurrencyCode;
  const rateMap = await getExchangeRates();

  const [periodTransactions, chartSourceTransactions, recentTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: periodStart, lte: now },
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
        date: { gte: chartDataStart, lte: now },
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
        date: { gte: periodStart, lte: now },
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
  ]);

  const categoryMap = new Map<string, number>();
  let totalSpent = 0;

  for (const transaction of periodTransactions) {
    const amount = transaction.amount.toNumber();
    const converted = convertAmount(
      amount,
      transaction.currency as CurrencyCode,
      primaryCurrency,
      rateMap
    );
    totalSpent += converted;
    categoryMap.set(transaction.category, (categoryMap.get(transaction.category) ?? 0) + converted);
  }

  const categoryTotals = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    summary: {
      primaryCurrency,
      financialMonthStartDay: user.financialMonthStartDay,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      totalSpent: Math.round(totalSpent * 100) / 100,
      transactionCount: periodTransactions.length,
      categoryTotals,
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
    chartTransactions: chartSourceTransactions.map((transaction) => {
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
    }),
  };
}
