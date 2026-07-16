import { z } from 'zod';

export const BILLING_CURRENCIES = ['PLN', 'EUR', 'GBP', 'USD'] as const;

export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

export const CHECKOUT_PLANS = ['PRO', 'PREMIUM'] as const;

export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number];

export const checkoutRequestSchema = z.object({
  currency: z.enum(BILLING_CURRENCIES),
  plan: z.enum(CHECKOUT_PLANS).default('PRO'),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const CHECKOUT_ERROR_CODES = {
  INVALID_CURRENCY: 'billing.errors.invalidCurrency',
  INVALID_PLAN: 'billing.errors.invalidPlan',
  PRICE_UNAVAILABLE: 'billing.errors.priceUnavailable',
  ALREADY_ON_PLAN: 'billing.errors.alreadyOnPlan',
} as const;

export function isBillingCurrency(value: string): value is BillingCurrency {
  return BILLING_CURRENCIES.includes(value as BillingCurrency);
}
