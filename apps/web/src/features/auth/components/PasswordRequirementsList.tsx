'use client';

import { Check, Circle } from 'lucide-react';
import { getPasswordRequirements } from '@shared/features/auth/schemas';
import { useT } from '@web/features/i18n/LocaleProvider';

type PasswordRequirementsListProps = {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
};

export function PasswordRequirementsList({
  password,
  confirmPassword = '',
  showMatch = false,
}: PasswordRequirementsListProps) {
  const t = useT();
  const requirements = getPasswordRequirements(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const items: { key: string; met: boolean; label: string }[] = [
    {
      key: 'minLength',
      met: requirements.minLength,
      label: t('auth.passwordRequirements.minLength'),
    },
    {
      key: 'digit',
      met: requirements.hasDigit,
      label: t('auth.passwordRequirements.digit'),
    },
    {
      key: 'special',
      met: requirements.hasSpecial,
      label: t('auth.passwordRequirements.special'),
    },
  ];

  if (showMatch) {
    items.push({
      key: 'match',
      met: passwordsMatch,
      label: t('auth.passwordRequirements.match'),
    });
  }

  return (
    <div className="mt-2 space-y-1.5" aria-live="polite">
      <p className="text-muted text-xs font-medium">{t('auth.passwordRequirements.title')}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-2 text-xs ${item.met ? 'text-cool' : 'text-muted'}`}
          >
            {item.met ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
