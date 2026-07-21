'use client';

import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useT } from '@web/features/i18n/LocaleProvider';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  id: string;
};

export function PasswordInput({ id, className, disabled, ...props }: PasswordInputProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={`auth-input pr-11 ${className ?? ''}`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className="text-muted hover:text-warm absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={t(visible ? 'auth.labels.hidePassword' : 'auth.labels.showPassword')}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
