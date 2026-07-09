import { SUPPORTED_CURRENCIES } from './constants';
import type { FrankfurterResponse } from './types';
import type { CurrencyCode } from '../transactions/schemas';

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app';

type RatePair = { from: CurrencyCode; to: CurrencyCode; rate: number };

/**
 * Fetches latest exchange rates from frankfurter.app (free, no API key).
 * Returns cross-rates between all supported currencies.
 */
export async function fetchRatesFromFrankfurter(): Promise<RatePair[]> {
  const pairs: RatePair[] = [];

  for (const base of SUPPORTED_CURRENCIES) {
    const targets = SUPPORTED_CURRENCIES.filter((c) => c !== base);
    const symbols = targets.join(',');

    const response = await fetch(`${FRANKFURTER_BASE_URL}/latest?from=${base}&to=${symbols}`);

    if (!response.ok) {
      throw new Error('currency.errors.fetchFailed');
    }

    const data = (await response.json()) as FrankfurterResponse;

    for (const [toCurrency, rate] of Object.entries(data.rates)) {
      if (SUPPORTED_CURRENCIES.includes(toCurrency as CurrencyCode)) {
        pairs.push({
          from: base,
          to: toCurrency as CurrencyCode,
          rate,
        });
      }
    }
  }

  return pairs;
}
