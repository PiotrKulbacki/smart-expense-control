export type PlanType = 'FREE' | 'PRO';

export const PLAN_LIMITS = {
  FREE: { aiScansPerMonth: 3 },
  PRO: { aiScansPerMonth: 150 },
} as const;

export type AiScanQuotaStatus = {
  limit: number;
  used: number;
  remaining: number;
  canScan: boolean;
  isBlocked: boolean;
};

export function getAiScanLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan].aiScansPerMonth;
}

export function getAiScanQuotaStatus(plan: PlanType, scansUsed: number): AiScanQuotaStatus {
  const limit = getAiScanLimit(plan);
  const remaining = Math.max(0, limit - scansUsed);
  const canScan = scansUsed < limit;

  return {
    limit,
    used: scansUsed,
    remaining,
    canScan,
    isBlocked: !canScan,
  };
}
