import { prisma, type Currency } from '@smart-expense-control/database';
import { getQuotaPeriodEnd, getQuotaPeriodStart } from '@shared/features/billing/financial-month';
import { convertAmount } from '@shared/features/currency';
import {
  aggregateRawCategoryTotals,
  appendFixedCostsCategory,
  roundMoney,
  sumRawTransactionAmounts,
  type PeriodAggregationSnapshot,
  type PeriodCategoryTotalPrimary,
  type PeriodCategoryTotalRaw,
  type PeriodTransactionRow,
} from '@shared/features/analytics/period-aggregation';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { getExchangeRates } from '@web/features/currency/services/currency.service';

const AGGREGATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  return date.toISOString();
}

function parseCategoryTotalsPrimary(value: unknown): PeriodCategoryTotalPrimary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is PeriodCategoryTotalPrimary =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as PeriodCategoryTotalPrimary).category === 'string' &&
      typeof (item as PeriodCategoryTotalPrimary).amount === 'number'
  );
}

function parseCategoryTotalsRaw(value: unknown): PeriodCategoryTotalRaw[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is PeriodCategoryTotalRaw =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as PeriodCategoryTotalRaw).category === 'string' &&
      typeof (item as PeriodCategoryTotalRaw).total === 'number' &&
      typeof (item as PeriodCategoryTotalRaw).currency === 'string'
  );
}

function rowToSnapshot(row: {
  periodStart: Date;
  periodEnd: Date;
  primaryCurrency: Currency;
  totalSpentPrimary: { toNumber(): number };
  totalSpentRaw: { toNumber(): number };
  fixedCostsTotal: { toNumber(): number };
  transactionCount: number;
  categoryTotalsPrimary: unknown;
  categoryTotalsRaw: unknown;
}): PeriodAggregationSnapshot {
  return {
    periodStart: toIsoDate(row.periodStart),
    periodEnd: toIsoDate(row.periodEnd),
    primaryCurrency: row.primaryCurrency,
    totalSpentPrimary: row.totalSpentPrimary.toNumber(),
    totalSpentRaw: row.totalSpentRaw.toNumber(),
    fixedCostsTotal: row.fixedCostsTotal.toNumber(),
    transactionCount: row.transactionCount,
    categoryTotalsPrimary: parseCategoryTotalsPrimary(row.categoryTotalsPrimary),
    categoryTotalsRaw: parseCategoryTotalsRaw(row.categoryTotalsRaw),
  };
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

  return roundMoney(total);
}

export async function computePeriodAggregationSnapshot(params: {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  primaryCurrency: CurrencyCode;
}): Promise<PeriodAggregationSnapshot> {
  const rateMap = await getExchangeRates();

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: params.userId,
      date: { gte: params.periodStart, lte: params.periodEnd },
    },
    select: {
      amount: true,
      currency: true,
      category: true,
    },
  });

  const transactionRows: PeriodTransactionRow[] = transactions.map((transaction) => ({
    amount: transaction.amount.toNumber(),
    currency: transaction.currency,
    category: transaction.category,
  }));

  const categoryMapPrimary = new Map<string, number>();
  let totalSpentPrimary = 0;

  for (const transaction of transactionRows) {
    const converted = convertAmount(
      transaction.amount,
      transaction.currency as CurrencyCode,
      params.primaryCurrency,
      rateMap
    );
    totalSpentPrimary += converted;
    categoryMapPrimary.set(
      transaction.category,
      roundMoney((categoryMapPrimary.get(transaction.category) ?? 0) + converted)
    );
  }

  const fixedCostsTotal = await getFixedCostsTotal(params.userId, params.primaryCurrency, rateMap);

  const categoryTotalsPrimary = appendFixedCostsCategory(
    Array.from(categoryMapPrimary.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    fixedCostsTotal
  );

  return {
    periodStart: toIsoDate(params.periodStart),
    periodEnd: toIsoDate(params.periodEnd),
    primaryCurrency: params.primaryCurrency,
    totalSpentPrimary: roundMoney(totalSpentPrimary),
    totalSpentRaw: sumRawTransactionAmounts(transactionRows),
    fixedCostsTotal,
    transactionCount: transactionRows.length,
    categoryTotalsPrimary,
    categoryTotalsRaw: aggregateRawCategoryTotals(transactionRows),
  };
}

async function persistPeriodAggregationSnapshot(
  userId: string,
  snapshot: PeriodAggregationSnapshot
): Promise<PeriodAggregationSnapshot> {
  await prisma.userPeriodAggregation.upsert({
    where: {
      userId_periodStart: {
        userId,
        periodStart: new Date(snapshot.periodStart),
      },
    },
    create: {
      userId,
      periodStart: new Date(snapshot.periodStart),
      periodEnd: new Date(snapshot.periodEnd),
      primaryCurrency: snapshot.primaryCurrency as Currency,
      totalSpentPrimary: snapshot.totalSpentPrimary,
      totalSpentRaw: snapshot.totalSpentRaw,
      fixedCostsTotal: snapshot.fixedCostsTotal,
      transactionCount: snapshot.transactionCount,
      categoryTotalsPrimary: snapshot.categoryTotalsPrimary,
      categoryTotalsRaw: snapshot.categoryTotalsRaw,
      isDirty: false,
      computedAt: new Date(),
    },
    update: {
      periodEnd: new Date(snapshot.periodEnd),
      primaryCurrency: snapshot.primaryCurrency as Currency,
      totalSpentPrimary: snapshot.totalSpentPrimary,
      totalSpentRaw: snapshot.totalSpentRaw,
      fixedCostsTotal: snapshot.fixedCostsTotal,
      transactionCount: snapshot.transactionCount,
      categoryTotalsPrimary: snapshot.categoryTotalsPrimary,
      categoryTotalsRaw: snapshot.categoryTotalsRaw,
      isDirty: false,
      computedAt: new Date(),
    },
  });

  return snapshot;
}

export async function refreshPeriodAggregation(
  userId: string,
  periodStart: Date
): Promise<PeriodAggregationSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryCurrency: true, financialMonthStartDay: true },
  });

  if (!user) {
    return null;
  }

  const periodEnd = getQuotaPeriodEnd(periodStart);
  const snapshot = await computePeriodAggregationSnapshot({
    userId,
    periodStart,
    periodEnd,
    primaryCurrency: user.primaryCurrency as CurrencyCode,
  });

  return persistPeriodAggregationSnapshot(userId, snapshot);
}

export async function getOrRefreshPeriodAggregation(
  userId: string,
  reference: Date = new Date()
): Promise<PeriodAggregationSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryCurrency: true, financialMonthStartDay: true },
  });

  if (!user) {
    return null;
  }

  const periodStart = getQuotaPeriodStart(user.financialMonthStartDay, reference);
  const cached = await prisma.userPeriodAggregation.findUnique({
    where: {
      userId_periodStart: {
        userId,
        periodStart,
      },
    },
  });

  if (cached && !cached.isDirty && cached.primaryCurrency === user.primaryCurrency) {
    return rowToSnapshot(cached);
  }

  return refreshPeriodAggregation(userId, periodStart);
}

export async function markUserPeriodDirty(userId: string, periodStart: Date): Promise<void> {
  await prisma.userPeriodAggregation.updateMany({
    where: { userId, periodStart },
    data: { isDirty: true },
  });
}

export async function markUserPeriodDirtyForDates(
  userId: string,
  financialMonthStartDay: number,
  dates: Date[]
): Promise<void> {
  const uniquePeriodStarts = new Set<number>();

  for (const date of dates) {
    const periodStart = getQuotaPeriodStart(financialMonthStartDay, date);
    uniquePeriodStarts.add(periodStart.getTime());
  }

  await Promise.all(
    Array.from(uniquePeriodStarts).map((timestamp) =>
      markUserPeriodDirty(userId, new Date(timestamp))
    )
  );
}

export async function invalidateAggregationForTransactionDates(
  userId: string,
  dates: Date[]
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { financialMonthStartDay: true },
  });

  if (!user) {
    return;
  }

  await markUserPeriodDirtyForDates(userId, user.financialMonthStartDay, dates);
}

export async function invalidateCurrentPeriodAggregation(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { financialMonthStartDay: true },
  });

  if (!user) {
    return;
  }

  const periodStart = getQuotaPeriodStart(user.financialMonthStartDay, new Date());
  await markUserPeriodDirty(userId, periodStart);
}

export async function clearUserPeriodAggregations(userId: string): Promise<void> {
  await prisma.userPeriodAggregation.deleteMany({ where: { userId } });
}

export async function refreshDirtyPeriodAggregations(batchSize: number): Promise<{
  refreshed: number;
  pruned: number;
}> {
  const dirtyRows = await prisma.userPeriodAggregation.findMany({
    where: { isDirty: true },
    take: batchSize,
    orderBy: { computedAt: 'asc' },
    select: { userId: true, periodStart: true },
  });

  for (const row of dirtyRows) {
    await refreshPeriodAggregation(row.userId, row.periodStart);
  }

  const pruneBefore = new Date(Date.now() - AGGREGATION_RETENTION_MS);
  const pruned = await prisma.userPeriodAggregation.deleteMany({
    where: { periodEnd: { lt: pruneBefore } },
  });

  return { refreshed: dirtyRows.length, pruned: pruned.count };
}
