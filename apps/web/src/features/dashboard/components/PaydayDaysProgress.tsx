'use client';

import { useT } from '@web/features/i18n/LocaleProvider';
import { cn } from '@web/lib/utils';

type PaydayDaysProgressProps = {
  daysUntilPayday: number;
  totalDays: number;
  daysFilled: number;
};

export function PaydayDaysProgress({
  daysUntilPayday,
  totalDays,
  daysFilled,
}: PaydayDaysProgressProps) {
  const t = useT();
  const remaining = Math.max(0, daysUntilPayday);
  const filled = Math.min(totalDays, Math.max(0, daysFilled));
  const isPaydayToday = remaining === 0 || filled === 0;
  const label = isPaydayToday
    ? t('dashboard.daily.paydayToday')
    : t('dashboard.daily.daysUntilPayday', {
        remaining,
        total: totalDays,
      });

  return (
    <div className="space-y-1.5">
      <p className="text-muted text-center text-xs">{label}</p>
      <div
        className="flex w-full gap-px sm:gap-0.5"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={totalDays}
        aria-valuenow={filled}
        aria-label={label}
      >
        {Array.from({ length: totalDays }, (_, index) => {
          const isFilled = index < filled;
          return (
            <div
              key={index}
              className={cn(
                'h-2 min-w-0 flex-1 rounded-[2px] border',
                isFilled ? 'border-cool/50 bg-cool' : 'border-[var(--border)] bg-transparent'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
