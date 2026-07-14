export const FINANCIAL_MONTH_DAY_MIN = 1;
export const FINANCIAL_MONTH_DAY_MAX = 28;

export const PAST_DUE_GRACE_MS = 24 * 60 * 60 * 1000;

export function clampFinancialMonthDay(day: number): number {
  return Math.min(FINANCIAL_MONTH_DAY_MAX, Math.max(FINANCIAL_MONTH_DAY_MIN, day));
}

export function getFinancialMonthStartDayFromDate(date: Date): number {
  return clampFinancialMonthDay(date.getUTCDate());
}

export function getQuotaPeriodStart(financialMonthStartDay: number, reference: Date): Date {
  const day = clampFinancialMonthDay(financialMonthStartDay);
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const currentDay = reference.getUTCDate();

  if (currentDay >= day) {
    return new Date(Date.UTC(year, month, day));
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export function shouldResetQuotaToday(
  financialMonthStartDay: number,
  lastQuotaResetAt: Date | null,
  reference: Date = new Date()
): boolean {
  const day = clampFinancialMonthDay(financialMonthStartDay);

  if (reference.getUTCDate() !== day) {
    return false;
  }

  const periodStart = getQuotaPeriodStart(day, reference);

  if (!lastQuotaResetAt) {
    return true;
  }

  return lastQuotaResetAt.getTime() < periodStart.getTime();
}

export function isPastDueGraceExpired(
  pastDueSince: Date | null,
  reference: Date = new Date()
): boolean {
  if (!pastDueSince) {
    return false;
  }

  return reference.getTime() - pastDueSince.getTime() >= PAST_DUE_GRACE_MS;
}

export function getQuotaPeriodEnd(periodStart: Date): Date {
  const end = new Date(periodStart);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  end.setUTCHours(23, 59, 59, 999);
  return end;
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

/** Full calendar days from reference date until cycle end (inclusive of end date as 0). */
export function getDaysRemainingInCycle(
  financialMonthStartDay: number,
  reference: Date = new Date()
): number {
  const periodStart = getQuotaPeriodStart(financialMonthStartDay, reference);
  const periodEnd = getQuotaPeriodEnd(periodStart);
  return Math.max(0, differenceInCalendarDays(periodEnd, reference));
}

/** Days until the next cycle start (same metric as dashboard `daysUntilPayday`). */
export function getDaysUntilNextCycle(
  financialMonthStartDay: number,
  reference: Date = new Date()
): number {
  const periodStart = getQuotaPeriodStart(financialMonthStartDay, reference);
  const nextCycleStart = new Date(periodStart);
  nextCycleStart.setUTCMonth(nextCycleStart.getUTCMonth() + 1);
  return differenceInCalendarDays(nextCycleStart, reference);
}

export function getBillingPeriodDayMetrics(
  financialMonthStartDay: number,
  reference: Date = new Date()
): {
  daysElapsed: number;
  daysUntilPayday: number;
  daysRemainingInCycle: number;
} {
  const periodStart = getQuotaPeriodStart(financialMonthStartDay, reference);

  return {
    daysElapsed: Math.max(1, differenceInCalendarDays(reference, periodStart) + 1),
    daysUntilPayday: getDaysUntilNextCycle(financialMonthStartDay, reference),
    daysRemainingInCycle: getDaysRemainingInCycle(financialMonthStartDay, reference),
  };
}

export function getPreviousQuotaPeriodStart(
  financialMonthStartDay: number,
  reference: Date = new Date()
): Date {
  const currentStart = getQuotaPeriodStart(financialMonthStartDay, reference);
  const previous = new Date(currentStart);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  return previous;
}

export function formatBillingPeriodLabel(
  periodStart: Date,
  periodEnd: Date,
  locale: string
): string {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const startMonth = formatter.format(periodStart);
  const endMonth = formatter.format(periodEnd);

  if (startMonth === endMonth) {
    return startMonth;
  }

  return `${startMonth} – ${endMonth}`;
}
