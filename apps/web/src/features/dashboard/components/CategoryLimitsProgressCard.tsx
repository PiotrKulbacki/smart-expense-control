'use client';

import type { CategoryLimitProgress } from '@shared/features/transactions/category-limit-schemas';
import { getCategoryLimitProgressHue } from '@shared/features/transactions/category-limit-schemas';
import { Progress } from '@web/components/ui/progress';
import { useT } from '@web/features/i18n/LocaleProvider';
import {
  resolveCategoryLabel,
  type CategoryDisplayContext,
} from '@web/features/transactions/lib/category-config';

type CategoryLimitsProgressCardProps = {
  limits: CategoryLimitProgress[];
  primaryCurrency: string;
  locale: string;
  categoryDisplayContext?: CategoryDisplayContext;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CategoryLimitsProgressCard({
  limits,
  primaryCurrency,
  locale,
  categoryDisplayContext,
}: CategoryLimitsProgressCardProps) {
  const t = useT();

  if (limits.length === 0) {
    return null;
  }

  return (
    <section className="panel relative z-10 p-6">
      <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
        {t('dashboard.categoryLimits.title')}
      </h2>
      <p className="text-muted relative z-10 mt-1 text-sm">
        {t('dashboard.categoryLimits.subtitle')}
      </p>

      <ul className="relative z-10 mt-5 space-y-4">
        {limits.map((limit) => {
          const barValue = Math.min(limit.percentage, 100);
          const hue = getCategoryLimitProgressHue(limit.percentage);

          return (
            <li key={limit.categoryKey} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-[var(--text)]">
                  {resolveCategoryLabel(limit.categoryKey, t, categoryDisplayContext)}
                </span>
                <span className="text-muted shrink-0 tabular-nums">
                  {t('dashboard.categoryLimits.progress', {
                    spent: formatMoney(limit.spentAmount, primaryCurrency, locale),
                    limit: formatMoney(limit.limitAmount, primaryCurrency, locale),
                  })}
                </span>
              </div>
              <Progress
                value={barValue}
                className="h-1.5"
                indicatorClassName=""
                indicatorStyle={{
                  backgroundColor: `hsl(${hue} 72% 48%)`,
                }}
              />
              <div className="text-muted flex items-center justify-between text-xs">
                <span>
                  {limit.isOverLimit
                    ? t('dashboard.categoryLimits.overLimit', {
                        amount: formatMoney(
                          Math.round((limit.spentAmount - limit.limitAmount) * 100) / 100,
                          primaryCurrency,
                          locale
                        ),
                      })
                    : t('dashboard.categoryLimits.remaining', {
                        amount: formatMoney(limit.remainingAmount, primaryCurrency, locale),
                      })}
                </span>
                <span className="tabular-nums">{limit.percentage}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
