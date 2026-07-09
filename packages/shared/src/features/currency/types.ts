import type { CurrencyCode } from '../transactions/schemas';

export type RateKey = `${CurrencyCode}:${CurrencyCode}`;

export type ExchangeRateMap = Partial<Record<RateKey, number>>;

export type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};
