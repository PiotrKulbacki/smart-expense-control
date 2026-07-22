import { de, enUS, es, pl, type Locale as DateFnsLocale } from 'react-day-picker/locale';
import type { Locale } from '@shared/features/i18n';

const DAY_PICKER_LOCALES: Record<Locale, DateFnsLocale> = {
  en: enUS,
  de,
  pl,
  es,
};

export function getDayPickerLocale(locale: Locale): DateFnsLocale {
  return DAY_PICKER_LOCALES[locale] ?? enUS;
}
