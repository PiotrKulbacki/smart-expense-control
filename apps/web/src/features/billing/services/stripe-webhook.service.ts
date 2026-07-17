import { prisma } from '@smart-expense-control/database';
import type { Plan } from '@smart-expense-control/database';
import { isPastDueGraceExpired } from '@shared/features/billing/financial-month';
import { isPaidPlan, type PaidPlanType } from '@shared/features/billing/plan-limits';
import { resolvePaidPlanFromStripePriceId } from '@shared/features/billing/stripe-prices';
import Stripe from 'stripe';
import { sendPastDueDunningEmail } from '@web/features/billing/services/dunning-email.service';
import {
  getStripePremiumPriceMap,
  getStripeProPriceMap,
} from '@web/features/billing/services/stripe-checkout.service';
import { buildProUpgradeBillingData } from '@web/features/billing/services/pro-upgrade-cycle-day.service';

type PlanUpdateResult = {
  userId: string;
  previousPlan: Plan;
  newPlan: Plan;
  stripeCustomerId: string;
} | null;

type UserBillingState = {
  id: string;
  email: string;
  currentPlan: Plan;
  stripeCustomerId: string | null;
  pastDueSince: Date | null;
  pastDueFirstEmailSentAt: Date | null;
  pastDueReminderSentAt: Date | null;
};

type PlanUpdateExtraData = {
  pastDueSince?: Date | null;
  pastDueFirstEmailSentAt?: Date | null;
  pastDueReminderSentAt?: Date | null;
  financialMonthStartDay?: number;
  financialMonthStartDayBeforePro?: number | null;
  pendingFinancialCycleDayChoice?: boolean;
  monthlyAiScansCount?: number;
  monthlyAiChatCount?: number;
  lastQuotaResetAt?: Date;
};

function isActiveSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing';
}

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

export function resolvePaidPlanFromSubscription(subscription: Stripe.Subscription): PaidPlanType {
  const metadataPlan = subscription.metadata?.checkoutPlan;
  if (metadataPlan === 'PRO' || metadataPlan === 'PREMIUM') {
    return metadataPlan;
  }

  const fromPrice = resolvePaidPlanFromStripePriceId(
    getSubscriptionPriceId(subscription),
    getStripeProPriceMap(),
    getStripePremiumPriceMap()
  );

  return fromPrice ?? 'PRO';
}

function resolvePlanFromSubscription(
  subscription: Stripe.Subscription,
  user: UserBillingState
): Plan {
  if (isActiveSubscriptionStatus(subscription.status)) {
    return resolvePaidPlanFromSubscription(subscription);
  }

  if (subscription.status === 'past_due') {
    const paidPlan = isPaidPlan(user.currentPlan)
      ? (user.currentPlan as PaidPlanType)
      : resolvePaidPlanFromSubscription(subscription);

    if (!user.pastDueSince) {
      return paidPlan;
    }

    return isPastDueGraceExpired(user.pastDueSince) ? 'FREE' : paidPlan;
  }

  return 'FREE';
}

function getPastDueSinceUpdate(
  subscription: Stripe.Subscription,
  user: UserBillingState
): Date | null {
  if (subscription.status === 'past_due') {
    return user.pastDueSince ?? new Date();
  }

  return null;
}

function clearPastDueEmailFlags(): Pick<
  PlanUpdateExtraData,
  'pastDueFirstEmailSentAt' | 'pastDueReminderSentAt'
> {
  return {
    pastDueFirstEmailSentAt: null,
    pastDueReminderSentAt: null,
  };
}

async function updateUserPlanByCustomerId(
  stripeCustomerId: string,
  newPlan: Plan,
  extraData?: PlanUpdateExtraData
): Promise<PlanUpdateResult> {
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId },
    select: {
      id: true,
      currentPlan: true,
      stripeCustomerId: true,
      pastDueSince: true,
    },
  });

  if (!user || !user.stripeCustomerId) {
    return null;
  }

  const previousPlan = user.currentPlan;
  const data: {
    currentPlan: Plan;
  } & PlanUpdateExtraData = {
    currentPlan: newPlan,
    ...extraData,
  };

  const planChanged = previousPlan !== newPlan;
  const hasExtraUpdates = extraData !== undefined;

  if (!planChanged && !hasExtraUpdates) {
    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data,
  });

  if (!planChanged) {
    return null;
  }

  return {
    userId: user.id,
    previousPlan,
    newPlan,
    stripeCustomerId: user.stripeCustomerId,
  };
}

async function updateUserPlanByUserId(
  userId: string,
  stripeCustomerId: string,
  newPlan: Plan,
  extraData?: PlanUpdateExtraData
): Promise<PlanUpdateResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, currentPlan: true },
  });

  if (!user) {
    return null;
  }

  const previousPlan = user.currentPlan;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId,
      currentPlan: newPlan,
      ...extraData,
    },
  });

  if (previousPlan === newPlan) {
    return null;
  }

  return {
    userId,
    previousPlan,
    newPlan,
    stripeCustomerId,
  };
}

function trackPlanChange(result: PlanUpdateResult): void {
  if (!result || result.previousPlan !== 'FREE' || !isPaidPlan(result.newPlan)) {
    return;
  }
  // Analytics are captured client-side only after cookie consent.
}

function resolveCheckoutPlan(
  session: Stripe.Checkout.Session,
  fallback: PaidPlanType = 'PRO'
): PaidPlanType {
  const metadataPlan = session.metadata?.checkoutPlan;
  if (metadataPlan === 'PRO' || metadataPlan === 'PREMIUM') {
    return metadataPlan;
  }

  return fallback;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!customerId) {
    return;
  }

  const checkoutPlan = resolveCheckoutPlan(session);
  const userId = session.metadata?.userId;
  const reference = new Date();
  let result: PlanUpdateResult = null;

  if (userId) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { financialMonthStartDay: true },
    });

    if (!existingUser) {
      return;
    }

    const upgradeBillingData = {
      ...buildProUpgradeBillingData(existingUser.financialMonthStartDay, reference),
      ...clearPastDueEmailFlags(),
    };
    result = await updateUserPlanByUserId(userId, customerId, checkoutPlan, upgradeBillingData);
  } else {
    const existingUser = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { financialMonthStartDay: true },
    });

    if (!existingUser) {
      return;
    }

    const upgradeBillingData = {
      ...buildProUpgradeBillingData(existingUser.financialMonthStartDay, reference),
      ...clearPastDueEmailFlags(),
    };
    result = await updateUserPlanByCustomerId(customerId, checkoutPlan, upgradeBillingData);
  }

  trackPlanChange(result);
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!customerId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: {
      id: true,
      email: true,
      currentPlan: true,
      stripeCustomerId: true,
      pastDueSince: true,
      pastDueFirstEmailSentAt: true,
      pastDueReminderSentAt: true,
    },
  });

  if (!user || !user.stripeCustomerId) {
    return;
  }

  const newPlan = resolvePlanFromSubscription(subscription, user);
  const pastDueSince = getPastDueSinceUpdate(subscription, user);
  const extra: PlanUpdateExtraData = { pastDueSince };

  if (pastDueSince === null) {
    Object.assign(extra, clearPastDueEmailFlags());
  }

  const result = await updateUserPlanByCustomerId(customerId, newPlan, extra);
  trackPlanChange(result);
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!customerId) {
    return;
  }

  await updateUserPlanByCustomerId(customerId, 'FREE', {
    pastDueSince: null,
    ...clearPastDueEmailFlags(),
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: {
      id: true,
      email: true,
      currentPlan: true,
      stripeCustomerId: true,
      pastDueSince: true,
      pastDueFirstEmailSentAt: true,
      pastDueReminderSentAt: true,
    },
  });

  if (!user?.stripeCustomerId || !isPaidPlan(user.currentPlan)) {
    return;
  }

  const pastDueSince = user.pastDueSince ?? new Date();
  const shouldSendFirstEmail = !user.pastDueFirstEmailSentAt;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pastDueSince,
      ...(shouldSendFirstEmail ? { pastDueFirstEmailSentAt: new Date() } : {}),
    },
  });

  if (shouldSendFirstEmail) {
    const sent = await sendPastDueDunningEmail({
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      kind: 'first',
    });

    if (!sent) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pastDueFirstEmailSentAt: null },
      });
    }
  }
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}
