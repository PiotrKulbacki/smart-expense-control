'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@web/components/ui/popover';
import { Progress } from '@web/components/ui/progress';
import { DashboardDailyStats } from '@web/features/dashboard/components/DashboardDailyStats';
import { PaydayDaysProgress } from '@web/features/dashboard/components/PaydayDaysProgress';
import type { DailyBudgetStats } from '@web/features/dashboard/lib/dashboard-daily-stats';
import type { PaydayCycleMetrics } from '@web/features/dashboard/lib/payday-cycle-metrics';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type BudgetProgressProps = {
  totalSpent: number;
  dailyStats: DailyBudgetStats;
  paydayMetrics: PaydayCycleMetrics;
  currentMonthBudget: number | null;
  primaryCurrency: string;
  locale: string;
  onBudgetUpdated?: (budget: number | null) => void;
  isRefreshing?: boolean;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BudgetProgress({
  totalSpent,
  dailyStats,
  paydayMetrics,
  currentMonthBudget,
  primaryCurrency,
  locale,
  onBudgetUpdated,
  isRefreshing = false,
}: BudgetProgressProps) {
  const t = useT();
  const { locale: appLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const paydaySection = (
    <div className="space-y-3">
      <DashboardDailyStats
        avgSpentPerDay={dailyStats.avgSpentPerDay}
        avgRemainingPerDay={dailyStats.avgRemainingPerDay}
        cycleEnded={dailyStats.cycleEnded}
        primaryCurrency={primaryCurrency}
        locale={locale}
      />
      <PaydayDaysProgress
        daysUntilPayday={paydayMetrics.daysUntilPayday}
        totalDays={paydayMetrics.totalDays}
        daysFilled={paydayMetrics.daysFilled}
      />
    </div>
  );

  if (currentMonthBudget == null || currentMonthBudget <= 0) {
    return <div className="mt-4">{paydaySection}</div>;
  }

  const budget = currentMonthBudget;
  const percentage = Math.min(Math.round((totalSpent / budget) * 100), 100);
  const remaining = Math.max(budget - totalSpent, 0);

  function openEditor() {
    setEditValue(String(budget));
    setIsOpen(true);
  }

  async function handleSave() {
    const parsed = Number(editValue);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t('settings.errors.invalidBudget'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentMonthBudget: parsed }),
      });

      const data = (await response.json()) as {
        user?: { currentMonthBudget: number | null };
        error?: string;
      };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'settings.errors.updateFailed', appLocale));
        return;
      }

      toast.success(t('dashboard.budget.updated'));
      onBudgetUpdated?.(data.user?.currentMonthBudget ?? parsed);
      setIsOpen(false);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      {isRefreshing ? (
        <div className="space-y-2" aria-hidden>
          <div className="flex justify-between">
            <div className="bg-elevated h-3 w-24 animate-pulse rounded" />
            <div className="bg-elevated h-3 w-16 animate-pulse rounded" />
          </div>
          <div className="bg-elevated h-1.5 animate-pulse rounded-full" />
          <div className="flex justify-between">
            <div className="bg-elevated h-3 w-20 animate-pulse rounded" />
            <div className="bg-elevated h-3 w-20 animate-pulse rounded" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">{t('dashboard.budget.label')}</span>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={openEditor}
                  className="text-muted hover:text-warm flex items-center gap-1 transition"
                  aria-label={t('dashboard.budget.editCurrent')}
                >
                  <span>{formatMoney(budget, primaryCurrency, locale)}</span>
                  <Pencil className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                <p className="text-sm font-medium text-[var(--text)]">
                  {t('dashboard.budget.editCurrent')}
                </p>
                <p className="text-muted mt-1 text-xs">{t('dashboard.budget.editCurrentHint')}</p>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={editValue}
                  disabled={isSaving}
                  onChange={(event) => setEditValue(event.target.value)}
                  className="mt-3"
                />
                <Button
                  type="button"
                  size="default"
                  className="mt-3 w-full"
                  loading={isSaving}
                  disabled={isSaving}
                  onClick={() => void handleSave()}
                >
                  {t('settings.labels.saveChanges')}
                </Button>
              </PopoverContent>
            </Popover>
          </div>
          <Progress value={percentage} className="h-1.5" />
          <div className="text-muted flex items-center justify-between text-xs">
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
        </>
      )}
      {paydaySection}
    </div>
  );
}
