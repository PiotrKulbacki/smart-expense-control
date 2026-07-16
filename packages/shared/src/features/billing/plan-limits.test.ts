import { describe, expect, it } from 'vitest';
import {
  getAiChatLimit,
  getAiChatQuotaStatus,
  getAiScanLimit,
  getAiScanQuotaStatus,
  getPhotoRetentionDays,
  getReceiptImageExpiresAt,
  isPaidPlan,
  PLAN_LIMITS,
} from './plan-limits';

describe('plan-limits', () => {
  it('defines FREE, PRO and PREMIUM scan limits', () => {
    expect(PLAN_LIMITS.FREE.aiScansPerMonth).toBe(5);
    expect(PLAN_LIMITS.PRO.aiScansPerMonth).toBe(50);
    expect(PLAN_LIMITS.PREMIUM.aiScansPerMonth).toBe(120);
  });

  it('defines chat limits', () => {
    expect(PLAN_LIMITS.FREE.aiChatMessagesPerMonth).toBe(10);
    expect(PLAN_LIMITS.PRO.aiChatMessagesPerMonth).toBe(50);
    expect(PLAN_LIMITS.PREMIUM.aiChatMessagesPerMonth).toBe(250);
  });

  it('defines photo retention days', () => {
    expect(getPhotoRetentionDays('FREE')).toBe(0);
    expect(getPhotoRetentionDays('PRO')).toBe(60);
    expect(getPhotoRetentionDays('PREMIUM')).toBe(365);
    expect(getReceiptImageExpiresAt('FREE')).toBeNull();
    expect(getReceiptImageExpiresAt('PRO')).toBeInstanceOf(Date);
  });

  it('identifies paid plans', () => {
    expect(isPaidPlan('FREE')).toBe(false);
    expect(isPaidPlan('PRO')).toBe(true);
    expect(isPaidPlan('PREMIUM')).toBe(true);
  });

  it('reports remaining scans for FREE user', () => {
    const status = getAiScanQuotaStatus('FREE', 2);
    expect(status.remaining).toBe(3);
    expect(status.canScan).toBe(true);
    expect(status.isBlocked).toBe(false);
  });

  it('blocks FREE user after 5 scans', () => {
    const status = getAiScanQuotaStatus('FREE', 5);
    expect(status.canScan).toBe(false);
    expect(status.isBlocked).toBe(true);
    expect(getAiScanLimit('FREE')).toBe(5);
  });

  it('blocks PRO user at 50 scans', () => {
    const status = getAiScanQuotaStatus('PRO', 50);
    expect(status.canScan).toBe(false);
    expect(status.isBlocked).toBe(true);
  });

  it('blocks FREE user after 10 chat messages', () => {
    const status = getAiChatQuotaStatus('FREE', 10);
    expect(status.canUse).toBe(false);
    expect(status.isBlocked).toBe(true);
    expect(getAiChatLimit('FREE')).toBe(10);
  });

  it('blocks PRO user after 50 chat messages', () => {
    const status = getAiChatQuotaStatus('PRO', 50);
    expect(status.canUse).toBe(false);
    expect(status.isBlocked).toBe(true);
  });

  it('allows PREMIUM user within chat quota', () => {
    const status = getAiChatQuotaStatus('PREMIUM', 100);
    expect(status.canUse).toBe(true);
    expect(status.remaining).toBe(150);
  });
});
