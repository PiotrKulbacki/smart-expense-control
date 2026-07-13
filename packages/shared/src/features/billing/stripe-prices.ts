import type { BillingCurrency } from './checkout';

export type StripeProPriceEnvKey =
  'STRIPE_PRO_PRICE_PLN' | 'STRIPE_PRO_PRICE_EUR' | 'STRIPE_PRO_PRICE_GBP';

const STRIPE_PRO_PRICE_ENV_KEYS: Record<BillingCurrency, StripeProPriceEnvKey> = {
  PLN: 'STRIPE_PRO_PRICE_PLN',
  EUR: 'STRIPE_PRO_PRICE_EUR',
  GBP: 'STRIPE_PRO_PRICE_GBP',
};

export function getStripeProPriceEnvKey(currency: BillingCurrency): StripeProPriceEnvKey {
  return STRIPE_PRO_PRICE_ENV_KEYS[currency];
}

export function resolveStripeProPriceId(
  currency: BillingCurrency,
  prices: Record<BillingCurrency, string | undefined>
): string | null {
  const priceId = prices[currency]?.trim();
  return priceId ? priceId : null;
}
