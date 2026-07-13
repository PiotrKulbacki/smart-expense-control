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
        'rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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
