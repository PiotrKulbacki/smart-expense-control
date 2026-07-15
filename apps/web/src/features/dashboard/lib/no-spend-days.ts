/**
 * Counts no-spend days within the user's billing cycle (payday → day before next payday).
 * Denominator is always the full billing-period length from settings — never a calendar month.
 * Recurring/fixed costs live in a separate table and are excluded by design.
 */

function toUtcDayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function toUtcCalendarDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function differenceInCalendarDays(laterDate: Date, earlierDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (toUtcCalendarDay(laterDate).getTime() - toUtcCalendarDay(earlierDate).getTime()) / msPerDay
  );
}

export type NoSpendDaysResult = {
  noSpendDays: number;
  totalDays: number;
  daysElapsed: number;
  /** Display string e.g. "12 / 31" — UI appends localized "days" label */
  ratio: string;
};

export function computeNoSpendDays(params: {
  periodStart: Date;
  periodEnd: Date;
  transactionDates: Date[];
  now?: Date;
}): NoSpendDaysResult {
  const now = params.now ?? new Date();
  const periodStart = toUtcCalendarDay(params.periodStart);
  const periodEnd = toUtcCalendarDay(params.periodEnd);
  const today = toUtcCalendarDay(now);

  const totalDays = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1);
  const elapsedEnd = today < periodStart ? periodStart : today > periodEnd ? periodEnd : today;
  const daysElapsed = Math.max(0, differenceInCalendarDays(elapsedEnd, periodStart) + 1);

  const spentDayKeys = new Set<string>();
  for (const date of params.transactionDates) {
    const day = toUtcCalendarDay(date);
    if (day < periodStart || day > elapsedEnd) {
      continue;
    }
    spentDayKeys.add(toUtcDayKey(day));
  }

  const noSpendDays = Math.max(0, daysElapsed - spentDayKeys.size);

  return {
    noSpendDays,
    totalDays,
    daysElapsed,
    ratio: `${noSpendDays} / ${totalDays}`,
  };
}
