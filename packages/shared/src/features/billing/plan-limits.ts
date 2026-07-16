export type PlanType = 'FREE' | 'PRO' | 'PREMIUM';

export const PAID_PLANS = ['PRO', 'PREMIUM'] as const;
export type PaidPlanType = (typeof PAID_PLANS)[number];

export const UNLIMITED_QUOTA = Number.MAX_SAFE_INTEGER;

export const PLAN_LIMITS = {
  FREE: {
    aiScansPerMonth: 5,
    aiChatMessagesPerMonth: 10,
    photoRetentionDays: 0,
  },
  PRO: {
    aiScansPerMonth: 50,
    aiChatMessagesPerMonth: 50,
    photoRetentionDays: 60,
  },
  PREMIUM: {
    aiScansPerMonth: 120,
    aiChatMessagesPerMonth: 250,
    photoRetentionDays: 365,
  },
} as const;

export type QuotaStatus = {
  limit: number;
  used: number;
  remaining: number;
  canUse: boolean;
  isBlocked: boolean;
};

export type AiScanQuotaStatus = QuotaStatus & {
  canScan: boolean;
};

function buildQuotaStatus(limit: number, used: number): QuotaStatus {
  const remaining = Math.max(0, limit - used);
  const canUse = used < limit;

  return {
    limit,
    used,
    remaining,
    canUse,
    isBlocked: !canUse,
  };
}

export function isPaidPlan(plan: PlanType | string): plan is PaidPlanType {
  return plan === 'PRO' || plan === 'PREMIUM';
}

export function getAiScanLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan].aiScansPerMonth;
}

export function getAiChatLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan].aiChatMessagesPerMonth;
}

export function getPhotoRetentionDays(plan: PlanType): number {
  return PLAN_LIMITS[plan].photoRetentionDays;
}

export function getReceiptImageExpiresAt(
  plan: PlanType,
  reference: Date = new Date()
): Date | null {
  const days = getPhotoRetentionDays(plan);
  if (days <= 0) {
    return null;
  }

  return new Date(reference.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getAiScanQuotaStatus(plan: PlanType, scansUsed: number): AiScanQuotaStatus {
  const status = buildQuotaStatus(getAiScanLimit(plan), scansUsed);

  return {
    ...status,
    canScan: status.canUse,
  };
}

export function getAiChatQuotaStatus(plan: PlanType, messagesUsed: number): QuotaStatus {
  return buildQuotaStatus(getAiChatLimit(plan), messagesUsed);
}
