import { prisma } from '@lyamo/database';
import {
  clampFinancialMonthDay,
  getFinancialMonthStartDayFromDate,
} from '@shared/features/billing/financial-month';
import type { ConfirmProUpgradeCycleDayInput } from '@shared/features/billing/pro-upgrade-cycle-day';
import { PRO_UPGRADE_CYCLE_DAY_ERROR_CODES } from '@shared/features/billing/pro-upgrade-cycle-day';
import { clearUserPeriodAggregations } from '@web/features/analytics/services/period-aggregation-cache.service';

export type ProUpgradeCycleDayStatus = {
  pending: boolean;
  previousDay: number | null;
  currentDay: number | null;
};

export function buildProUpgradeBillingData(
  previousFinancialMonthStartDay: number,
  reference: Date = new Date()
) {
  const nextFinancialMonthStartDay = getFinancialMonthStartDayFromDate(reference);
  const cycleDayChanged = previousFinancialMonthStartDay !== nextFinancialMonthStartDay;

  return {
    financialMonthStartDay: nextFinancialMonthStartDay,
    monthlyAiScansCount: 0,
    monthlyAiChatCount: 0,
    lastQuotaResetAt: reference,
    pastDueSince: null,
    ...(cycleDayChanged
      ? {
          financialMonthStartDayBeforePro: previousFinancialMonthStartDay,
          pendingFinancialCycleDayChoice: true,
        }
      : {
          financialMonthStartDayBeforePro: null,
          pendingFinancialCycleDayChoice: false,
        }),
  };
}

export async function getProUpgradeCycleDayStatus(
  userId: string
): Promise<ProUpgradeCycleDayStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pendingFinancialCycleDayChoice: true,
      financialMonthStartDayBeforePro: true,
      financialMonthStartDay: true,
    },
  });

  if (!user || !user.pendingFinancialCycleDayChoice) {
    return { pending: false, previousDay: null, currentDay: null };
  }

  return {
    pending: true,
    previousDay: user.financialMonthStartDayBeforePro,
    currentDay: user.financialMonthStartDay,
  };
}

export async function confirmProUpgradeCycleDay(
  userId: string,
  input: ConfirmProUpgradeCycleDayInput
): Promise<{ financialMonthStartDay: number } | { error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pendingFinancialCycleDayChoice: true,
      financialMonthStartDayBeforePro: true,
      financialMonthStartDay: true,
    },
  });

  if (!user?.pendingFinancialCycleDayChoice || user.financialMonthStartDayBeforePro == null) {
    return { error: PRO_UPGRADE_CYCLE_DAY_ERROR_CODES.NOT_PENDING };
  }

  const resolvedDay =
    input.choice === 'keep_previous'
      ? clampFinancialMonthDay(user.financialMonthStartDayBeforePro)
      : clampFinancialMonthDay(input.day);

  await prisma.user.update({
    where: { id: userId },
    data: {
      financialMonthStartDay: resolvedDay,
      financialMonthStartDayBeforePro: null,
      pendingFinancialCycleDayChoice: false,
    },
  });

  if (resolvedDay !== user.financialMonthStartDay) {
    await clearUserPeriodAggregations(userId);
  }

  return { financialMonthStartDay: resolvedDay };
}
