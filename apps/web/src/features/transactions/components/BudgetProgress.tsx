'use client';

import { useT } from '@web/features/i18n/LocaleProvider';
import { Progress } from '@web/components/ui/progress';

type BudgetProgressProps = {
  totalSpent: number;
  primaryCurrency: string;
  locale: string;
};

const PLACEHOLDER_BUDGET = 3000;

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BudgetProgress({ totalSpent, primaryCurrency, locale }: BudgetProgressProps) {
  const t = useT();
  const budget = PLACEHOLDER_BUDGET;
  const percentage = Math.min(Math.round((totalSpent / budget) * 100), 100);
  const remaining = Math.max(budget - totalSpent, 0);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-500">{t('dashboard.budget.label')}</span>
        <span className="text-gray-400">{t('dashboard.budget.preview')}</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('dashboard.budget.spent', {
            amount: formatMoney(totalSpent, primaryCurrency, locale),
          })}
        </span>
        <span>
          {t('dashboard.budget.remaining', {
            amount: formatMoney(remaining, primaryCurrency, locale),
          })}
        </span>
      </div>
    </div>
  );
}
