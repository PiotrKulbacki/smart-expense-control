import Stripe from 'stripe';
import {
  CHECKOUT_ERROR_CODES,
  resolveStripeProPriceId,
  type BillingCurrency,
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
  };
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  currency: BillingCurrency;
}): Promise<{ url: string } | { error: string }> {
  const stripe = getStripeClient();
  const priceId = resolveStripeProPriceId(params.currency, getConfiguredStripeProPrices());

  if (!stripe || !priceId) {
    return { error: CHECKOUT_ERROR_CODES.PRICE_UNAVAILABLE };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ...(params.stripeCustomerId
      ? { customer: params.stripeCustomerId }
      : { customer_email: params.email }),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.NEXT_PUBLIC_APP_URL}/settings?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings?checkout=cancel`,
    metadata: { userId: params.userId, checkoutCurrency: params.currency },
    subscription_data: {
      metadata: { userId: params.userId, checkoutCurrency: params.currency },
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
