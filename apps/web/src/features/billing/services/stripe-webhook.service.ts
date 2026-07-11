import { prisma } from '@smart-expense-control/database';
import type { Plan } from '@smart-expense-control/database';
import {
  getFinancialMonthStartDayFromDate,
  isPastDueGraceExpired,
} from '@shared/features/billing/financial-month';
import Stripe from 'stripe';
import { ANALYTICS_EVENTS } from '@web/features/analytics/events';
import { captureServerEvent } from '@web/features/analytics/posthog-server';

type PlanUpdateResult = {
  userId: string;
  previousPlan: Plan;
  newPlan: Plan;
  stripeCustomerId: string;
} | null;

type UserBillingState = {
  id: string;
  currentPlan: Plan;
  stripeCustomerId: string | null;
  pastDueSince: Date | null;
};

function isProSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing';
}

function resolvePlanFromSubscription(
  subscription: Stripe.Subscription,
  user: UserBillingState
): Plan {
  if (isProSubscriptionStatus(subscription.status)) {
    return 'PRO';
  }

  if (subscription.status === 'past_due') {
    if (!user.pastDueSince) {
      return 'PRO';
    }

    return isPastDueGraceExpired(user.pastDueSince) ? 'FREE' : 'PRO';
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

function getProUpgradeBillingData(reference: Date = new Date()) {
  return {
    financialMonthStartDay: getFinancialMonthStartDayFromDate(reference),
    monthlyAiScansCount: 0,
    monthlyAiChatCount: 0,
    lastQuotaResetAt: reference,
    pastDueSince: null,
  };
}

async function updateUserPlanByCustomerId(
  stripeCustomerId: string,
  newPlan: Plan,
  extraData?: {
    pastDueSince?: Date | null;
    financialMonthStartDay?: number;
    monthlyAiScansCount?: number;
    monthlyAiChatCount?: number;
    lastQuotaResetAt?: Date;
  }
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
    pastDueSince?: Date | null;
    financialMonthStartDay?: number;
    monthlyAiScansCount?: number;
    monthlyAiChatCount?: number;
    lastQuotaResetAt?: Date;
  } = {
    currentPlan: newPlan,
    ...extraData,
  };

  if (extraData?.pastDueSince !== undefined) {
    data.pastDueSince = extraData.pastDueSince;
  }

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
  extraData?: {
    pastDueSince?: Date | null;
    financialMonthStartDay?: number;
    monthlyAiScansCount?: number;
    monthlyAiChatCount?: number;
    lastQuotaResetAt?: Date;
  }
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
  if (!result || result.newPlan !== 'PRO' || result.previousPlan !== 'FREE') {
    return;
  }

  captureServerEvent(result.userId, ANALYTICS_EVENTS.SUBSCRIPTION_UPGRADED, {
    userId: result.userId,
    previousPlan: result.previousPlan,
    newPlan: result.newPlan,
    stripeCustomerId: result.stripeCustomerId,
  });
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!customerId) {
    return;
  }

  const userId = session.metadata?.userId;
  const upgradeBillingData = getProUpgradeBillingData();
  let result: PlanUpdateResult = null;

  if (userId) {
    result = await updateUserPlanByUserId(userId, customerId, 'PRO', upgradeBillingData);
  } else {
    result = await updateUserPlanByCustomerId(customerId, 'PRO', upgradeBillingData);
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
      currentPlan: true,
      stripeCustomerId: true,
      pastDueSince: true,
    },
  });

  if (!user || !user.stripeCustomerId) {
    return;
  }

  const newPlan = resolvePlanFromSubscription(subscription, user);
  const pastDueSince = getPastDueSinceUpdate(subscription, user);

  const result = await updateUserPlanByCustomerId(customerId, newPlan, { pastDueSince });
  trackPlanChange(result);
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!customerId) {
    return;
  }

  await updateUserPlanByCustomerId(customerId, 'FREE', { pastDueSince: null });
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
    default:
      break;
  }
}
