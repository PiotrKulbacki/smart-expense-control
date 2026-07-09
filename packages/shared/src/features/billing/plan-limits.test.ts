import { describe, expect, it } from 'vitest';
import { getAiScanLimit, getAiScanQuotaStatus, PLAN_LIMITS } from './plan-limits';

describe('plan-limits', () => {
  it('defines FREE and PRO scan limits', () => {
    expect(PLAN_LIMITS.FREE.aiScansPerMonth).toBe(3);
    expect(PLAN_LIMITS.PRO.aiScansPerMonth).toBe(150);
  });

  it('reports remaining scans for FREE user', () => {
    const status = getAiScanQuotaStatus('FREE', 2);
    expect(status.remaining).toBe(1);
    expect(status.canScan).toBe(true);
    expect(status.isBlocked).toBe(false);
  });

  it('blocks FREE user after 3 scans', () => {
    const status = getAiScanQuotaStatus('FREE', 3);
    expect(status.canScan).toBe(false);
    expect(status.isBlocked).toBe(true);
    expect(getAiScanLimit('FREE')).toBe(3);
  });

  it('blocks PRO user at 150 scans', () => {
    const status = getAiScanQuotaStatus('PRO', 150);
    expect(status.canScan).toBe(false);
    expect(status.isBlocked).toBe(true);
  });
});
