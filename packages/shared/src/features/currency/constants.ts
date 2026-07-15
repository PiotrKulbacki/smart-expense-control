import { CURRENCY_CODES, type CurrencyCode } from '../transactions/schemas';

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [...CURRENCY_CODES];

export const DEFAULT_PRIMARY_CURRENCY: CurrencyCode = 'PLN';

/** How long cached DB rates are considered fresh before re-fetching from API. */
export const EXCHANGE_RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Fallback rates used when both API and DB are unavailable. */
export const STABLE_FALLBACK_RATES: Record<string, number> = {
  'PLN:EUR': 0.23,
  'PLN:GBP': 0.2,
  'PLN:USD': 0.25,
  'EUR:PLN': 4.35,
  'EUR:GBP': 0.86,
  'EUR:USD': 1.08,
  'GBP:PLN': 5.05,
  'GBP:EUR': 1.16,
  'GBP:USD': 1.27,
  'USD:PLN': 4.0,
  'USD:EUR': 0.93,
  'USD:GBP': 0.79,
};
