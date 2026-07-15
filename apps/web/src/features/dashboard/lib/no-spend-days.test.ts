import { describe, expect, it } from 'vitest';
import { getQuotaPeriodEnd, getQuotaPeriodStart } from '@shared/features/billing/financial-month';
import { computeNoSpendDays } from './no-spend-days';

describe('computeNoSpendDays', () => {
  it('counts days without transactions in the elapsed portion of the period', () => {
    const periodStart = new Date(Date.UTC(2026, 6, 1));
    const periodEnd = new Date(Date.UTC(2026, 6, 31));
    const now = new Date(Date.UTC(2026, 6, 10, 12, 0, 0));

    const result = computeNoSpendDays({
      periodStart,
      periodEnd,
      now,
      transactionDates: [
        new Date(Date.UTC(2026, 6, 2)),
        new Date(Date.UTC(2026, 6, 2)),
        new Date(Date.UTC(2026, 6, 5)),
        new Date(Date.UTC(2026, 6, 15)), // future relative to now — ignored
      ],
    });

    // Elapsed days Jul 1–10 = 10; spent days = Jul 2, Jul 5 → 8 no-spend
    expect(result.daysElapsed).toBe(10);
    expect(result.totalDays).toBe(31);
    expect(result.noSpendDays).toBe(8);
    expect(result.ratio).toBe('8 / 31');
  });

  it('returns full elapsed days as no-spend when there are no transactions', () => {
    const periodStart = new Date(Date.UTC(2026, 6, 1));
    const periodEnd = new Date(Date.UTC(2026, 6, 31));
    const now = new Date(Date.UTC(2026, 6, 7));

    const result = computeNoSpendDays({
      periodStart,
      periodEnd,
      now,
      transactionDates: [],
    });

    expect(result.noSpendDays).toBe(7);
    expect(result.ratio).toBe('7 / 31');
  });

  it('uses payday billing-cycle length, not calendar month length', () => {
    // Payday on the 10th → cycle Jul 10 … Aug 9 (31 days), not July 1–31
    const financialMonthStartDay = 10;
    const now = new Date(Date.UTC(2026, 6, 20, 12, 0, 0));
    const periodStart = getQuotaPeriodStart(financialMonthStartDay, now);
    const periodEnd = getQuotaPeriodEnd(periodStart);

    expect(periodStart.toISOString().slice(0, 10)).toBe('2026-07-10');
    expect(periodEnd.toISOString().slice(0, 10)).toBe('2026-08-09');

    const result = computeNoSpendDays({
      periodStart,
      periodEnd,
      now,
      transactionDates: [
        new Date(Date.UTC(2026, 6, 12)),
        new Date(Date.UTC(2026, 6, 15)),
        new Date(Date.UTC(2026, 6, 1)), // before cycle — ignored
      ],
    });

    // Elapsed Jul 10–20 = 11; spent Jul 12, Jul 15 → 9 no-spend; total = 31 (cycle, not Jul calendar)
    expect(result.daysElapsed).toBe(11);
    expect(result.totalDays).toBe(31);
    expect(result.noSpendDays).toBe(9);
    expect(result.ratio).toBe('9 / 31');
  });

  it('spans months when payday is mid-month (Feb → Mar)', () => {
    const financialMonthStartDay = 15;
    const now = new Date(Date.UTC(2026, 1, 20)); // Feb 20
    const periodStart = getQuotaPeriodStart(financialMonthStartDay, now);
    const periodEnd = getQuotaPeriodEnd(periodStart);

    expect(periodStart.toISOString().slice(0, 10)).toBe('2026-02-15');
    expect(periodEnd.toISOString().slice(0, 10)).toBe('2026-03-14');

    const result = computeNoSpendDays({
      periodStart,
      periodEnd,
      now,
      transactionDates: [new Date(Date.UTC(2026, 1, 16))],
    });

    // Feb 15–Mar 14 = 28 days; elapsed Feb 15–20 = 6; spent 1 day → 5 no-spend
    expect(result.totalDays).toBe(28);
    expect(result.daysElapsed).toBe(6);
    expect(result.noSpendDays).toBe(5);
    expect(result.ratio).toBe('5 / 28');
  });
});
