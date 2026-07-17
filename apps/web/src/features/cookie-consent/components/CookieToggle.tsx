'use client';

import { cn } from '@web/lib/utils';

type CookieToggleProps = {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
};

export function CookieToggle({
  id,
  checked,
  disabled = false,
  onCheckedChange,
  label,
}: CookieToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        'focus-visible:ring-warm/30 relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2',
        checked ? 'border-cool/40 bg-cool/30' : 'bg-elevated border-[var(--border)]',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow transition-transform',
          checked ? 'bg-cool translate-x-5' : 'bg-muted translate-x-0'
        )}
      />
    </button>
  );
}
