import { addMonths, differenceInCalendarDays } from 'date-fns';
import { getQuotaPeriodStart } from '@shared/features/billing/financial-month';

function toUtcCalendarDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export type PaydayCycleMetrics = {
  totalDays: number;
  daysUntilPayday: number;
  daysFilled: number;
};

/** Billing-cycle payday countdown (independent of chart date filter). */
export function getPaydayCycleMetrics(
  financialMonthStartDay: number,
  now = new Date()
): PaydayCycleMetrics {
  const periodStart = getQuotaPeriodStart(financialMonthStartDay, now);
  const nextPayday = addMonths(periodStart, 1);
  const totalDays = Math.max(
    1,
    differenceInCalendarDays(toUtcCalendarDay(nextPayday), toUtcCalendarDay(periodStart))
  );
  const daysUntilPayday = Math.max(
    0,
    differenceInCalendarDays(toUtcCalendarDay(nextPayday), toUtcCalendarDay(now))
  );
  const daysFilled = Math.min(totalDays, Math.max(0, totalDays - daysUntilPayday));

  return { totalDays, daysUntilPayday, daysFilled };
}
