import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@web/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'bg-elevated/50 font-display placeholder:text-muted focus-visible:border-warm/30 focus-visible:ring-warm/20 flex h-10 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = 'Input';
