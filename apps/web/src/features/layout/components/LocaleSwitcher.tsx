'use client';

import { SUPPORTED_LOCALES, type Locale } from '@shared/features/i18n';
import { useLocale } from '@web/features/i18n/LocaleProvider';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  pl: 'PL',
  de: 'DE',
  es: 'ES',
};

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className={
        className ??
        'bg-elevated/50 focus:border-warm/30 focus:ring-warm/20 rounded-lg border border-[var(--border)] px-2 py-1.5 font-mono text-sm text-[var(--text)] focus:outline-none focus:ring-1'
      }
      aria-label="Language"
    >
      {SUPPORTED_LOCALES.map((supportedLocale) => (
        <option key={supportedLocale} value={supportedLocale}>
          {LOCALE_LABELS[supportedLocale]}
        </option>
      ))}
    </select>
  );
}
