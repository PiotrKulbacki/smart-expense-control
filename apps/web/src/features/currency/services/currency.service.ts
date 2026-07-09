import { prisma, type Currency } from '@smart-expense-control/database';
import {
  buildRateMapFromPairs,
  convertAmount,
  EXCHANGE_RATE_CACHE_TTL_MS,
  fetchRatesFromFrankfurter,
  STABLE_FALLBACK_RATES,
  type ExchangeRateMap,
} from '@shared/features/currency';
import type { CurrencyCode } from '@shared/features/transactions/schemas';

function mapDbRates(
  rows: Array<{ fromCurrency: Currency; toCurrency: Currency; rate: { toNumber(): number } }>
): ExchangeRateMap {
  return buildRateMapFromPairs(
    rows.map((row) => ({
      from: row.fromCurrency as CurrencyCode,
      to: row.toCurrency as CurrencyCode,
      rate: row.rate.toNumber(),
    }))
  );
}

async function getLatestDbRates(): Promise<ExchangeRateMap> {
  const currencies: CurrencyCode[] = ['PLN', 'EUR', 'GBP'];
  const pairs: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }> = [];

  for (const from of currencies) {
    for (const to of currencies) {
      if (from === to) continue;

      const latest = await prisma.exchangeRate.findFirst({
        where: { fromCurrency: from, toCurrency: to },
        orderBy: { fetchedAt: 'desc' },
      });

      if (latest) {
        pairs.push({ from, to, rate: latest.rate.toNumber() });
      }
    }
  }

  return buildRateMapFromPairs(pairs);
}

function isCacheFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < EXCHANGE_RATE_CACHE_TTL_MS;
}

async function getNewestRateTimestamp(): Promise<Date | null> {
  const newest = await prisma.exchangeRate.findFirst({
    orderBy: { fetchedAt: 'desc' },
    select: { fetchedAt: true },
  });

  return newest?.fetchedAt ?? null;
}

async function persistRates(
  pairs: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>
): Promise<void> {
  const fetchedAt = new Date();

  await prisma.exchangeRate.createMany({
    data: pairs.map((pair) => ({
      fromCurrency: pair.from,
      toCurrency: pair.to,
      rate: pair.rate,
      fetchedAt,
    })),
  });
}

/**
 * Ensures fresh exchange rates are available in the database.
 * Falls back to last known DB rates, then to stable hardcoded rates.
 */
export async function syncExchangeRates(): Promise<ExchangeRateMap> {
  const newestTimestamp = await getNewestRateTimestamp();

  if (newestTimestamp && isCacheFresh(newestTimestamp)) {
    return getLatestDbRates();
  }

  try {
    const fetchedPairs = await fetchRatesFromFrankfurter();
    await persistRates(fetchedPairs);
    return buildRateMapFromPairs(fetchedPairs);
  } catch {
    const dbRates = await getLatestDbRates();
    if (Object.keys(dbRates).length > 0) {
      return dbRates;
    }

    return STABLE_FALLBACK_RATES as ExchangeRateMap;
  }
}

export async function getExchangeRates(): Promise<ExchangeRateMap> {
  return syncExchangeRates();
}

export async function convertToPrimaryCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  primaryCurrency: CurrencyCode = 'PLN'
): Promise<{ convertedAmount: number; rateMap: ExchangeRateMap }> {
  const rateMap = await getExchangeRates();
  const convertedAmount = convertAmount(amount, fromCurrency, primaryCurrency, rateMap);

  return { convertedAmount, rateMap };
}
