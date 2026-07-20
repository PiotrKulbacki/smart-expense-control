import { prisma } from '@lyamo/database';
import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { handleStripeWebhookEvent } from '@web/features/billing/services/stripe-webhook.service';
import { captureServerException } from '@web/lib/sentry-server';

export type StripeWebhookProcessResult =
  { status: 'processed' } | { status: 'duplicate' } | { status: 'failed'; error: unknown };

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function processStripeWebhookEvent(
  event: Stripe.Event
): Promise<StripeWebhookProcessResult> {
  try {
    await prisma.processedStripeEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        status: 'processing',
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existing = await prisma.processedStripeEvent.findUnique({
      where: { eventId: event.id },
      select: { status: true },
    });

    if (existing?.status === 'completed') {
      return { status: 'duplicate' };
    }

    return { status: 'duplicate' };
  }

  try {
    await handleStripeWebhookEvent(event);

    await prisma.processedStripeEvent.update({
      where: { eventId: event.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    return { status: 'processed' };
  } catch (error) {
    captureServerException(error, {
      scope: 'stripe.webhook',
      eventId: event.id,
      eventType: event.type,
    });

    await prisma.processedStripeEvent
      .delete({
        where: { eventId: event.id },
      })
      .catch(() => undefined);

    return { status: 'failed', error };
  }
}
