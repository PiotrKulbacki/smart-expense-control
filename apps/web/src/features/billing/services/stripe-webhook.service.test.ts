import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

const { mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@lyamo/database', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

vi.mock('@web/features/billing/services/dunning-email.service', () => ({
  sendPastDueDunningEmail: vi.fn(),
}));

vi.mock('@web/features/billing/services/stripe-checkout.service', () => ({
  getStripeProPriceMap: () => ({
    PLN: 'price_pro_pln',
    EUR: 'price_pro_eur',
    GBP: 'price_pro_gbp',
    USD: 'price_pro_usd',
  }),
  getStripePremiumPriceMap: () => ({
    PLN: 'price_premium_pln',
    EUR: 'price_premium_eur',
    GBP: 'price_premium_gbp',
    USD: 'price_premium_usd',
  }),
}));

import {
  handleCheckoutSessionCompleted,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '@web/features/billing/services/stripe-webhook.service';

describe('stripe-webhook.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({});
  });

  it('upgrades user to PRO on checkout.session.completed via metadata.userId', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ financialMonthStartDay: 12 })
      .mockResolvedValueOnce({ id: 'user-1', currentPlan: 'FREE' });

    await handleCheckoutSessionCompleted({
      customer: 'cus_123',
      metadata: { userId: 'user-1', checkoutPlan: 'PRO' },
    } as unknown as Stripe.Checkout.Session);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        stripeCustomerId: 'cus_123',
        currentPlan: 'PRO',
        monthlyAiScansCount: 0,
        monthlyAiChatCount: 0,
        pastDueSince: null,
        financialMonthStartDay: expect.any(Number),
      }),
    });
  });

  it('upgrades user to PREMIUM when checkoutPlan metadata is set', async () => {
    mockFindUnique
      .mockResolvedValueOnce({ financialMonthStartDay: 1 })
      .mockResolvedValueOnce({ id: 'user-prem', currentPlan: 'FREE' });

    await handleCheckoutSessionCompleted({
      customer: 'cus_prem',
      metadata: { userId: 'user-prem', checkoutPlan: 'PREMIUM' },
    } as unknown as Stripe.Checkout.Session);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-prem' },
      data: expect.objectContaining({
        currentPlan: 'PREMIUM',
      }),
    });
  });

  it('downgrades user to FREE on subscription deleted', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-2',
      currentPlan: 'PRO',
      stripeCustomerId: 'cus_456',
      pastDueSince: new Date(),
    });

    await handleSubscriptionDeleted({
      customer: 'cus_456',
      status: 'canceled',
    } as Stripe.Subscription);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: {
        currentPlan: 'FREE',
        pastDueSince: null,
        pastDueFirstEmailSentAt: null,
        pastDueReminderSentAt: null,
      },
    });
  });

  it('keeps PRO during past_due grace period', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-3',
      email: 'user3@example.com',
      currentPlan: 'PRO',
      stripeCustomerId: 'cus_789',
      pastDueSince: new Date(),
      pastDueFirstEmailSentAt: null,
      pastDueReminderSentAt: null,
    });

    await handleSubscriptionUpdated({
      customer: 'cus_789',
      status: 'past_due',
      items: { data: [{ price: { id: 'price_pro_eur' } }] },
      metadata: {},
    } as unknown as Stripe.Subscription);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-3' },
      data: {
        currentPlan: 'PRO',
        pastDueSince: expect.any(Date),
      },
    });
  });

  it('downgrades to FREE when past_due grace expired', async () => {
    const expired = new Date(Date.now() - 25 * 60 * 60 * 1000);

    mockFindUnique.mockResolvedValue({
      id: 'user-4',
      email: 'user4@example.com',
      currentPlan: 'PRO',
      stripeCustomerId: 'cus_999',
      pastDueSince: expired,
      pastDueFirstEmailSentAt: new Date(),
      pastDueReminderSentAt: new Date(),
    });

    await handleSubscriptionUpdated({
      customer: 'cus_999',
      status: 'past_due',
      items: { data: [{ price: { id: 'price_pro_eur' } }] },
      metadata: {},
    } as unknown as Stripe.Subscription);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-4' },
      data: {
        currentPlan: 'FREE',
        pastDueSince: expired,
      },
    });
  });

  it('keeps PRO when subscription is active with cancel_at_period_end', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-5',
      email: 'user5@example.com',
      currentPlan: 'PRO',
      stripeCustomerId: 'cus_555',
      pastDueSince: null,
      pastDueFirstEmailSentAt: null,
      pastDueReminderSentAt: null,
    });

    await handleSubscriptionUpdated({
      customer: 'cus_555',
      status: 'active',
      cancel_at_period_end: true,
      items: { data: [{ price: { id: 'price_pro_eur' } }] },
      metadata: { checkoutPlan: 'PRO' },
    } as unknown as Stripe.Subscription);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-5' },
      data: {
        currentPlan: 'PRO',
        pastDueSince: null,
        pastDueFirstEmailSentAt: null,
        pastDueReminderSentAt: null,
      },
    });
  });
});
