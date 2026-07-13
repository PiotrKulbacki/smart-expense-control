import type { BillingCurrency } from './checkout';

export const FEATURE_FLAG_PRO_PROMO_PRICING = 'pro-promo-pricing';

export const PRO_SUBSCRIPTION_PRICES = {
  regular: {
    PLN: 25,
    EUR: 6,
    GBP: 4.5,
  },
  promo: {
    PLN: 12,
    EUR: 4,
    GBP: 3,
  },
} as const satisfies Record<'regular' | 'promo', Record<BillingCurrency, number>>;

export function getProDiscountPercent(currency: BillingCurrency): number {
  const regular = PRO_SUBSCRIPTION_PRICES.regular[currency];
  const promo = PRO_SUBSCRIPTION_PRICES.promo[currency];
  return Math.round(((regular - promo) / regular) * 100);
}

export function formatProSubscriptionPrice(
  amount: number,
  currency: BillingCurrency,
  locale: string
): string {
  const fractionDigits = amount % 1 === 0 ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
