import { prisma } from '@lyamo/database';
import {
  buildRateMapFromPairs,
  convertAmount,
  EXCHANGE_RATE_CACHE_TTL_MS,
  fetchRatesFromFrankfurter,
  STABLE_FALLBACK_RATES,
  type ExchangeRateMap,
} from '@shared/features/currency';
import type { CurrencyCode } from '@shared/features/transactions/schemas';

const IN_MEMORY_CACHE_TTL_MS = 60_000;

let inMemoryRateCache: { map: ExchangeRateMap; expiresAt: number } | null = null;

function getInMemoryRates(): ExchangeRateMap | null {
  if (!inMemoryRateCache || Date.now() >= inMemoryRateCache.expiresAt) {
    return null;
  }

  return inMemoryRateCache.map;
}

function setInMemoryRates(map: ExchangeRateMap): ExchangeRateMap {
  inMemoryRateCache = {
    map,
    expiresAt: Date.now() + IN_MEMORY_CACHE_TTL_MS,
  };

  return map;
}

async function getLatestDbRates(): Promise<ExchangeRateMap> {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: { fetchedAt: 'desc' },
    select: {
      fromCurrency: true,
      toCurrency: true,
      rate: true,
    },
  });

  const latestByPair = new Map<string, { from: CurrencyCode; to: CurrencyCode; rate: number }>();

  for (const entry of rates) {
    const from = entry.fromCurrency as CurrencyCode;
    const to = entry.toCurrency as CurrencyCode;

    if (from === to) {
      continue;
    }

    const key = `${from}:${to}`;
    if (!latestByPair.has(key)) {
      latestByPair.set(key, { from, to, rate: entry.rate.toNumber() });
    }
  }

  return buildRateMapFromPairs(Array.from(latestByPair.values()));
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
  const cachedRates = getInMemoryRates();
  if (cachedRates) {
    return cachedRates;
  }

  const newestTimestamp = await getNewestRateTimestamp();

  if (newestTimestamp && isCacheFresh(newestTimestamp)) {
    return setInMemoryRates(await getLatestDbRates());
  }

  try {
    const fetchedPairs = await fetchRatesFromFrankfurter();
    await persistRates(fetchedPairs);
    return setInMemoryRates(buildRateMapFromPairs(fetchedPairs));
  } catch {
    const dbRates = await getLatestDbRates();
    if (Object.keys(dbRates).length > 0) {
      return setInMemoryRates(dbRates);
    }

    return setInMemoryRates(STABLE_FALLBACK_RATES as ExchangeRateMap);
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
