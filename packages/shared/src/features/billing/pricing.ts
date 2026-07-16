import type { BillingCurrency } from './checkout';
import type { PaidPlanType } from './plan-limits';

export const PRO_PROMO_CODE = 'PROMO50';
export const PRO_PROMO_DISCOUNT_PERCENT = 50;

export const PRO_SUBSCRIPTION_PRICES = {
  regular: {
    PLN: 34,
    EUR: 8,
    GBP: 6.5,
    USD: 9,
  },
} as const satisfies Record<'regular', Record<BillingCurrency, number>>;

export const PREMIUM_SUBSCRIPTION_PRICES = {
  regular: {
    PLN: 46,
    EUR: 11,
    GBP: 8.5,
    USD: 12,
  },
} as const satisfies Record<'regular', Record<BillingCurrency, number>>;

export function getPlanRegularPrice(plan: PaidPlanType, currency: BillingCurrency): number {
  return plan === 'PREMIUM'
    ? PREMIUM_SUBSCRIPTION_PRICES.regular[currency]
    : PRO_SUBSCRIPTION_PRICES.regular[currency];
}

export function getPlanPromoPrice(plan: PaidPlanType, currency: BillingCurrency): number {
  const regular = getPlanRegularPrice(plan, currency);
  return Math.round(regular * (1 - PRO_PROMO_DISCOUNT_PERCENT / 100) * 100) / 100;
}

/** @deprecated Prefer getPlanPromoPrice('PRO', currency) */
export function getProPromoPrice(currency: BillingCurrency): number {
  return getPlanPromoPrice('PRO', currency);
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
