'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useT } from '@web/features/i18n/LocaleProvider';

type DashboardDailyStatsProps = {
  avgSpentPerDay: number;
  avgRemainingPerDay: number | null;
  cycleEnded: boolean;
  primaryCurrency: string;
  locale: string;
};

function formatDailyAmount(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function DashboardDailyStats({
  avgSpentPerDay,
  avgRemainingPerDay,
  cycleEnded,
  primaryCurrency,
  locale,
}: DashboardDailyStatsProps) {
  const t = useT();
  const spentAmount = formatDailyAmount(avgSpentPerDay, primaryCurrency, locale);
  const remainingAmount =
    avgRemainingPerDay != null
      ? formatDailyAmount(avgRemainingPerDay, primaryCurrency, locale)
      : null;

  return (
    <div className="text-muted-foreground flex w-full items-start gap-2 text-xs">
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 leading-snug">
          <div>{t('dashboard.daily.avgSpentLabel')}</div>
          <div>{t('dashboard.daily.avgAmountPerDay', { amount: spentAmount })}</div>
        </div>
      </div>

      {(cycleEnded || remainingAmount != null) && (
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="inline-flex max-w-full items-start gap-1.5 text-right">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <div className="min-w-0 leading-snug">
              {cycleEnded ? (
                <div>{t('dashboard.daily.cycleEnd')}</div>
              ) : (
                <>
                  <div>{t('dashboard.daily.avgRemainingLabel')}</div>
                  <div>{t('dashboard.daily.avgAmountPerDay', { amount: remainingAmount! })}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
