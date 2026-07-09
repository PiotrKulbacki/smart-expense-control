import type { CurrencyCode } from '../transactions/schemas';

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['PLN', 'EUR', 'GBP'];

export const DEFAULT_PRIMARY_CURRENCY: CurrencyCode = 'PLN';

/** How long cached DB rates are considered fresh before re-fetching from API. */
export const EXCHANGE_RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Fallback rates used when both API and DB are unavailable. */
export const STABLE_FALLBACK_RATES: Record<string, number> = {
  'PLN:EUR': 0.23,
  'PLN:GBP': 0.2,
  'EUR:PLN': 4.35,
  'EUR:GBP': 0.86,
  'GBP:PLN': 5.05,
  'GBP:EUR': 1.16,
};
