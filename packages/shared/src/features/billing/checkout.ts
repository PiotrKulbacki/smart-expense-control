import { z } from 'zod';

export const BILLING_CURRENCIES = ['PLN', 'EUR', 'GBP'] as const;

export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

export const checkoutRequestSchema = z.object({
  currency: z.enum(BILLING_CURRENCIES),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const CHECKOUT_ERROR_CODES = {
  INVALID_CURRENCY: 'billing.errors.invalidCurrency',
  PRICE_UNAVAILABLE: 'billing.errors.priceUnavailable',
} as const;

export function isBillingCurrency(value: string): value is BillingCurrency {
  return BILLING_CURRENCIES.includes(value as BillingCurrency);
}
