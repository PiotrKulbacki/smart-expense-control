import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@web/env';
import { processStripeWebhookEvent } from '@web/features/billing/services/stripe-webhook-idempotency';
import { shutdownPostHog } from '@web/features/analytics/posthog-server';
import { captureServerException } from '@web/lib/sentry-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const body = await request.text();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const result = await processStripeWebhookEvent(event);
  await shutdownPostHog();

  if (result.status === 'failed') {
    captureServerException(result.error, {
      scope: 'stripe.webhook.route',
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, duplicate: result.status === 'duplicate' });
}
