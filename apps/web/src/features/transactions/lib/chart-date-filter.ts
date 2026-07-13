export type ChartDateRange = 'period' | '7d' | 'today';

export type ChartTransaction = {
  date: string;
  category: string;
  convertedAmount: number;
};

export function getChartRangeStart(range: ChartDateRange, periodStart: string, now = new Date()): Date {
  if (range === 'today') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  if (range === '7d') {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  return new Date(periodStart);
}

export function aggregateCategoryTotals(
  transactions: ChartTransaction[],
  range: ChartDateRange,
  periodStart: string
): Array<{ category: string; amount: number }> {
  const rangeStart = getChartRangeStart(range, periodStart);
  const categoryMap = new Map<string, number>();

  for (const transaction of transactions) {
    const transactionDate = new Date(transaction.date);
    if (transactionDate < rangeStart) {
      continue;
    }

    categoryMap.set(
      transaction.category,
      (categoryMap.get(transaction.category) ?? 0) + transaction.convertedAmount
    );
  }

  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

export function getChartDataFetchStart(periodStart: Date, now = new Date()): Date {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  return periodStart < sevenDaysAgo ? periodStart : sevenDaysAgo;
}
