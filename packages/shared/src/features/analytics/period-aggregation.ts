import { FIXED_COSTS_CATEGORY } from '../transactions/fixed-costs';

export type PeriodCategoryTotalPrimary = {
  category: string;
  amount: number;
};

export type PeriodCategoryTotalRaw = {
  category: string;
  total: number;
  currency: string;
};

export type PeriodAggregationSnapshot = {
  periodStart: string;
  periodEnd: string;
  primaryCurrency: string;
  totalSpentPrimary: number;
  totalSpentRaw: number;
  fixedCostsTotal: number;
  transactionCount: number;
  categoryTotalsPrimary: PeriodCategoryTotalPrimary[];
  categoryTotalsRaw: PeriodCategoryTotalRaw[];
};

export type PeriodTransactionRow = {
  amount: number;
  currency: string;
  category: string;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function aggregateRawCategoryTotals(
  transactions: PeriodTransactionRow[]
): PeriodCategoryTotalRaw[] {
  const categoryMap = new Map<string, { total: number; currency: string }>();

  for (const transaction of transactions) {
    const key = `${transaction.category}::${transaction.currency}`;
    const existing = categoryMap.get(key);

    if (existing) {
      existing.total += transaction.amount;
    } else {
      categoryMap.set(key, { total: transaction.amount, currency: transaction.currency });
    }
  }

  return Array.from(categoryMap.entries()).map(([key, value]) => {
    const [category] = key.split('::');
    return {
      category,
      total: roundMoney(value.total),
      currency: value.currency,
    };
  });
}

export function sumRawTransactionAmounts(transactions: PeriodTransactionRow[]): number {
  return roundMoney(transactions.reduce((sum, transaction) => sum + transaction.amount, 0));
}

export function appendFixedCostsCategory(
  categoryTotals: PeriodCategoryTotalPrimary[],
  fixedCostsTotal: number
): PeriodCategoryTotalPrimary[] {
  if (fixedCostsTotal <= 0) {
    return categoryTotals;
  }

  const totals = [...categoryTotals];
  const existingIndex = totals.findIndex((item) => item.category === FIXED_COSTS_CATEGORY);

  if (existingIndex >= 0) {
    totals[existingIndex] = {
      category: FIXED_COSTS_CATEGORY,
      amount: roundMoney(totals[existingIndex].amount + fixedCostsTotal),
    };
  } else {
    totals.push({ category: FIXED_COSTS_CATEGORY, amount: fixedCostsTotal });
  }

  return totals.sort((a, b) => b.amount - a.amount);
}
