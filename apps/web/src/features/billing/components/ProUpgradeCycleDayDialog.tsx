'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import {
  FINANCIAL_MONTH_DAY_MAX,
  FINANCIAL_MONTH_DAY_MIN,
} from '@shared/features/billing/financial-month';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@web/components/ui/alert-dialog';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type CycleDayChoice = 'keep_previous' | 'set_custom';

type ProUpgradeCycleDayDialogProps = {
  open: boolean;
  previousDay: number;
  currentDay: number;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (financialMonthStartDay: number) => void;
};

export function ProUpgradeCycleDayDialog({
  open,
  previousDay,
  currentDay,
  onOpenChange,
  onConfirmed,
}: ProUpgradeCycleDayDialogProps) {
  const t = useT();
  const { locale } = useLocale();
  const [choice, setChoice] = useState<CycleDayChoice>('keep_previous');
  const [customDay, setCustomDay] = useState(currentDay);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);

    try {
      const payload =
        choice === 'keep_previous'
          ? { choice: 'keep_previous' as const }
          : { choice: 'set_custom' as const, day: customDay };

      const response = await fetch('/api/billing/confirm-cycle-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        financialMonthStartDay?: number;
        error?: string;
      };

      if (!response.ok || data.financialMonthStartDay == null) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('billing.cycleDayModal.success'));
      onOpenChange(false);
      onConfirmed(data.financialMonthStartDay);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('billing.cycleDayModal.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('billing.cycleDayModal.description', {
              previousDay,
              currentDay,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="relative z-10 space-y-3">
          <label className="panel-muted flex cursor-pointer items-start gap-3 rounded-xl p-4">
            <input
              type="radio"
              name="cycle-day-choice"
              checked={choice === 'keep_previous'}
              disabled={isSubmitting}
              onChange={() => setChoice('keep_previous')}
              className="mt-1"
            />
            <span className="text-sm text-[var(--text)]">
              {t('billing.cycleDayModal.keepPrevious', { day: previousDay })}
            </span>
          </label>

          <label className="panel-muted flex cursor-pointer items-start gap-3 rounded-xl p-4">
            <input
              type="radio"
              name="cycle-day-choice"
              checked={choice === 'set_custom'}
              disabled={isSubmitting}
              onChange={() => setChoice('set_custom')}
              className="mt-1"
            />
            <span className="flex-1 text-sm text-[var(--text)]">
              <span className="block">{t('billing.cycleDayModal.setCustom')}</span>
              <input
                type="number"
                min={FINANCIAL_MONTH_DAY_MIN}
                max={FINANCIAL_MONTH_DAY_MAX}
                value={customDay}
                disabled={isSubmitting || choice !== 'set_custom'}
                onChange={(event) => setCustomDay(Number(event.target.value))}
                className="auth-input mt-2"
              />
            </span>
          </label>

          <p className="text-muted text-xs">{t('billing.cycleDayModal.hint')}</p>
        </div>

        <AlertDialogFooter>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleConfirm()}
            className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSubmitting && <LoadingSpinner />}
            {t('billing.cycleDayModal.confirm')}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
