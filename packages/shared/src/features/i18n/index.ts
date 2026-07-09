import de from './de.json';
import en from './en.json';
import es from './es.json';
import pl from './pl.json';

export type Locale = 'en' | 'de' | 'pl' | 'es';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'de', 'pl', 'es'];

export const DEFAULT_LOCALE: Locale = 'en';

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationTree = { [key: string]: TranslationValue };

const translations: Record<Locale, TranslationTree> = { en, de, pl, es };

function resolveKey(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split('.');
  let current: string | TranslationTree | undefined = tree;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return typeof current === 'string' ? current : undefined;
}

export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  const localized = resolveKey(translations[locale], key);
  if (localized) {
    return localized;
  }

  const fallback = resolveKey(translations[DEFAULT_LOCALE], key);
  return fallback ?? key;
}

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export type AuthErrorCode =
  | 'auth.errors.invalidEmail'
  | 'auth.errors.passwordTooShort'
  | 'auth.errors.passwordNeedsDigit'
  | 'auth.errors.passwordNeedsSpecial'
  | 'auth.errors.passwordsMismatch'
  | 'auth.errors.nameTooShort'
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.userExists'
  | 'auth.errors.unauthorized'
  | 'auth.errors.sessionExpired'
  | 'auth.errors.oauthFailed'
  | 'auth.errors.generic'
  | 'auth.errors.networkError';

export function translateError(code: string, locale: Locale = DEFAULT_LOCALE): string {
  if (
    code.startsWith('auth.') ||
    code.startsWith('transactions.') ||
    code.startsWith('recurring.') ||
    code.startsWith('scanner.') ||
    code.startsWith('currency.')
  ) {
    return t(code, locale);
  }
  return t('auth.errors.generic', locale);
}
