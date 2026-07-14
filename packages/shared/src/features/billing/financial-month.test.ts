import { describe, expect, it } from 'vitest';
import {
  clampFinancialMonthDay,
  getDaysRemainingInCycle,
  getFinancialMonthStartDayFromDate,
  getQuotaPeriodEnd,
  getQuotaPeriodStart,
  isPastDueGraceExpired,
  PAST_DUE_GRACE_MS,
  shouldResetQuotaToday,
} from './financial-month';

describe('financial-month', () => {
  it('clamps day to 1-28', () => {
    expect(clampFinancialMonthDay(31)).toBe(28);
    expect(clampFinancialMonthDay(0)).toBe(1);
    expect(clampFinancialMonthDay(15)).toBe(15);
  });

  it('derives financial month start day from date', () => {
    expect(getFinancialMonthStartDayFromDate(new Date('2026-07-15T12:00:00Z'))).toBe(15);
    expect(getFinancialMonthStartDayFromDate(new Date('2026-01-31T12:00:00Z'))).toBe(28);
  });

  it('calculates quota period start within current month', () => {
    const reference = new Date('2026-07-20T10:00:00Z');
    const periodStart = getQuotaPeriodStart(15, reference);

    expect(periodStart.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });

  it('calculates quota period start from previous month when before anchor day', () => {
    const reference = new Date('2026-07-10T10:00:00Z');
    const periodStart = getQuotaPeriodStart(15, reference);

    expect(periodStart.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('requires reset on financial month start day when not reset this period', () => {
    const reference = new Date('2026-07-15T08:00:00Z');

    expect(shouldResetQuotaToday(15, null, reference)).toBe(true);
    expect(shouldResetQuotaToday(15, new Date('2026-06-15T00:00:00Z'), reference)).toBe(true);
    expect(shouldResetQuotaToday(15, new Date('2026-07-15T01:00:00Z'), reference)).toBe(false);
    expect(shouldResetQuotaToday(10, new Date('2026-06-10T00:00:00Z'), reference)).toBe(false);
  });

  it('detects expired past_due grace period', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    const started = new Date(now.getTime() - PAST_DUE_GRACE_MS - 1);

    expect(isPastDueGraceExpired(started, now)).toBe(true);
    expect(isPastDueGraceExpired(new Date(now.getTime() - 1000), now)).toBe(false);
    expect(isPastDueGraceExpired(null, now)).toBe(false);
  });

  it('calculates days remaining until cycle end', () => {
    const reference = new Date('2026-07-14T12:00:00Z');
    const periodStart = getQuotaPeriodStart(12, reference);
    const periodEnd = getQuotaPeriodEnd(periodStart);

    expect(periodStart.toISOString()).toBe('2026-07-12T00:00:00.000Z');
    expect(periodEnd.toISOString()).toBe('2026-08-11T23:59:59.999Z');
    expect(getDaysRemainingInCycle(12, reference)).toBe(28);
  });

  it('returns 0 on the last day of the billing cycle', () => {
    const lastDay = new Date('2026-08-11T18:00:00Z');

    expect(getDaysRemainingInCycle(12, lastDay)).toBe(0);
  });
});
