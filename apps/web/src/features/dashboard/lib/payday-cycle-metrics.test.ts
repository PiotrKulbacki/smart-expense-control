import { describe, expect, it } from 'vitest';
import { getPaydayCycleMetrics } from '@web/features/dashboard/lib/payday-cycle-metrics';

describe('getPaydayCycleMetrics', () => {
  it('counts full cycle length and remaining days on cycle start (payday)', () => {
    // Cycle starts on the 10th; on 2026-07-10 → 31 days until 2026-08-10
    const metrics = getPaydayCycleMetrics(10, new Date(Date.UTC(2026, 6, 10, 12)));

    expect(metrics.totalDays).toBe(31);
    expect(metrics.daysUntilPayday).toBe(31);
    expect(metrics.daysFilled).toBe(0);
  });

  it('fills elapsed days as payday approaches', () => {
    const metrics = getPaydayCycleMetrics(10, new Date(Date.UTC(2026, 6, 22, 12)));

    expect(metrics.totalDays).toBe(31);
    expect(metrics.daysUntilPayday).toBe(19);
    expect(metrics.daysFilled).toBe(12);
  });

  it('has one day remaining on the last day before next payday', () => {
    const metrics = getPaydayCycleMetrics(10, new Date(Date.UTC(2026, 7, 9, 12)));

    expect(metrics.totalDays).toBe(31);
    expect(metrics.daysUntilPayday).toBe(1);
    expect(metrics.daysFilled).toBe(30);
  });
});
