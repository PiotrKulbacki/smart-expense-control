import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@shared/features/i18n';

const LOCALE_COOKIE = 'sec_locale';

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}
