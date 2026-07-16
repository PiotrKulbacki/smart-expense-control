import Stripe from 'stripe';
import {
  CHECKOUT_ERROR_CODES,
  resolveStripePaidPriceId,
  type BillingCurrency,
  type CheckoutPlan,
} from '@shared/features/billing';
import { env } from '@web/env';

function getStripeClient(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(env.STRIPE_SECRET_KEY);
}

function getConfiguredStripeProPrices(): Record<BillingCurrency, string | undefined> {
  return {
    PLN: env.STRIPE_PRO_PRICE_PLN,
    EUR: env.STRIPE_PRO_PRICE_EUR,
    GBP: env.STRIPE_PRO_PRICE_GBP,
    USD: env.STRIPE_PRO_PRICE_USD,
  };
}

function getConfiguredStripePremiumPrices(): Record<BillingCurrency, string | undefined> {
  return {
    PLN: env.STRIPE_PREMIUM_PRICE_PLN,
    EUR: env.STRIPE_PREMIUM_PRICE_EUR,
    GBP: env.STRIPE_PREMIUM_PRICE_GBP,
    USD: env.STRIPE_PREMIUM_PRICE_USD,
  };
}

export function getStripeProPriceMap(): Record<BillingCurrency, string | undefined> {
  return getConfiguredStripeProPrices();
}

export function getStripePremiumPriceMap(): Record<BillingCurrency, string | undefined> {
  return getConfiguredStripePremiumPrices();
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  currency: BillingCurrency;
  plan: CheckoutPlan;
}): Promise<{ url: string } | { error: string }> {
  const stripe = getStripeClient();
  const priceMap =
    params.plan === 'PREMIUM' ? getConfiguredStripePremiumPrices() : getConfiguredStripeProPrices();
  const priceId = resolveStripePaidPriceId(params.plan, params.currency, priceMap);

  if (!stripe || !priceId) {
    return { error: CHECKOUT_ERROR_CODES.PRICE_UNAVAILABLE };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ...(params.stripeCustomerId
      ? { customer: params.stripeCustomerId }
      : { customer_email: params.email }),
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/settings?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings?checkout=cancel`,
    metadata: {
      userId: params.userId,
      checkoutCurrency: params.currency,
      checkoutPlan: params.plan,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        checkoutCurrency: params.currency,
        checkoutPlan: params.plan,
      },
    },
  });

  if (!session.url) {
    return { error: CHECKOUT_ERROR_CODES.PRICE_UNAVAILABLE };
  }

  return { url: session.url };
}

export async function createBillingPortalSession(
  stripeCustomerId: string
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripeClient();

  if (!stripe) {
    return { error: 'billing.errors.portalUnavailable' };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return { url: session.url };
}
