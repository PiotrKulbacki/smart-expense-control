import type { BillingCurrency } from './checkout';
import type { PaidPlanType } from './plan-limits';

export type StripeProPriceEnvKey =
  'STRIPE_PRO_PRICE_PLN' | 'STRIPE_PRO_PRICE_EUR' | 'STRIPE_PRO_PRICE_GBP' | 'STRIPE_PRO_PRICE_USD';

export type StripePremiumPriceEnvKey =
  | 'STRIPE_PREMIUM_PRICE_PLN'
  | 'STRIPE_PREMIUM_PRICE_EUR'
  | 'STRIPE_PREMIUM_PRICE_GBP'
  | 'STRIPE_PREMIUM_PRICE_USD';

export type StripePaidPriceEnvKey = StripeProPriceEnvKey | StripePremiumPriceEnvKey;

const STRIPE_PRO_PRICE_ENV_KEYS: Record<BillingCurrency, StripeProPriceEnvKey> = {
  PLN: 'STRIPE_PRO_PRICE_PLN',
  EUR: 'STRIPE_PRO_PRICE_EUR',
  GBP: 'STRIPE_PRO_PRICE_GBP',
  USD: 'STRIPE_PRO_PRICE_USD',
};

const STRIPE_PREMIUM_PRICE_ENV_KEYS: Record<BillingCurrency, StripePremiumPriceEnvKey> = {
  PLN: 'STRIPE_PREMIUM_PRICE_PLN',
  EUR: 'STRIPE_PREMIUM_PRICE_EUR',
  GBP: 'STRIPE_PREMIUM_PRICE_GBP',
  USD: 'STRIPE_PREMIUM_PRICE_USD',
};

export function getStripeProPriceEnvKey(currency: BillingCurrency): StripeProPriceEnvKey {
  return STRIPE_PRO_PRICE_ENV_KEYS[currency];
}

export function getStripePremiumPriceEnvKey(currency: BillingCurrency): StripePremiumPriceEnvKey {
  return STRIPE_PREMIUM_PRICE_ENV_KEYS[currency];
}

export function getStripePaidPriceEnvKey(
  plan: PaidPlanType,
  currency: BillingCurrency
): StripePaidPriceEnvKey {
  return plan === 'PREMIUM'
    ? getStripePremiumPriceEnvKey(currency)
    : getStripeProPriceEnvKey(currency);
}

export function resolveStripeProPriceId(
  currency: BillingCurrency,
  prices: Record<BillingCurrency, string | undefined>
): string | null {
  return resolveStripePaidPriceId('PRO', currency, prices);
}

export function resolveStripePaidPriceId(
  plan: PaidPlanType,
  currency: BillingCurrency,
  prices: Record<BillingCurrency, string | undefined>
): string | null {
  const priceId = prices[currency]?.trim();
  return priceId ? priceId : null;
}

export function resolvePaidPlanFromStripePriceId(
  priceId: string | null | undefined,
  proPrices: Record<BillingCurrency, string | undefined>,
  premiumPrices: Record<BillingCurrency, string | undefined>
): PaidPlanType | null {
  if (!priceId) {
    return null;
  }

  const normalized = priceId.trim();
  if (!normalized) {
    return null;
  }

  for (const currency of Object.keys(premiumPrices) as BillingCurrency[]) {
    if (premiumPrices[currency]?.trim() === normalized) {
      return 'PREMIUM';
    }
  }

  for (const currency of Object.keys(proPrices) as BillingCurrency[]) {
    if (proPrices[currency]?.trim() === normalized) {
      return 'PRO';
    }
  }

  return null;
}
