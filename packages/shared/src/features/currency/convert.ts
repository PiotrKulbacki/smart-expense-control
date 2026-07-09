import { STABLE_FALLBACK_RATES } from './constants';
import type { ExchangeRateMap, RateKey } from './types';
import type { CurrencyCode } from '../transactions/schemas';

function buildRateKey(from: CurrencyCode, to: CurrencyCode): RateKey {
  return `${from}:${to}`;
}

function getDirectRate(
  rates: ExchangeRateMap,
  from: CurrencyCode,
  to: CurrencyCode,
  allowFallback = false
): number | undefined {
  if (from === to) {
    return 1;
  }

  const direct = rates[buildRateKey(from, to)];
  if (direct !== undefined) {
    return direct;
  }

  if (allowFallback) {
    return STABLE_FALLBACK_RATES[buildRateKey(from, to)];
  }

  return undefined;
}

/**
 * Converts an amount from source currency to the user's primary currency.
 * Uses direct rate when available; otherwise triangulates via PLN.
 */
export function convertAmount(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: ExchangeRateMap
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const directRate = getDirectRate(rates, fromCurrency, toCurrency);
  if (directRate !== undefined) {
    return roundCurrency(amount * directRate);
  }

  const toPln = getDirectRate(rates, fromCurrency, 'PLN');
  const fromPln = getDirectRate(rates, 'PLN', toCurrency);

  if (toPln !== undefined && fromPln !== undefined) {
    return roundCurrency(amount * toPln * fromPln);
  }

  const fallbackRate = getDirectRate(rates, fromCurrency, toCurrency, true);
  if (fallbackRate !== undefined) {
    return roundCurrency(amount * fallbackRate);
  }

  throw new Error('currency.errors.rateUnavailable');
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildRateMapFromPairs(
  pairs: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>
): ExchangeRateMap {
  const map: ExchangeRateMap = {};

  for (const { from, to, rate } of pairs) {
    map[buildRateKey(from, to)] = rate;
  }

  return map;
}
