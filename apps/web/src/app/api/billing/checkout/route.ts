import { NextResponse } from 'next/server';
import { checkoutRequestSchema, isPaidPlan } from '@shared/features/billing';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { createCheckoutSession } from '@web/features/billing/services/stripe-checkout.service';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const body = await request.json();
    if (typeof body.immediateAccessConsent !== 'boolean') {
      return jsonError('billing.errors.immediateAccessConsentRequired', 400);
    }

    const parsed = checkoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('billing.errors.invalidCurrency', 400);
    }

    const targetPlan = parsed.data.plan;
    const immediateAccessConsent = parsed.data.immediateAccessConsent;

    if (!immediateAccessConsent) {
      return jsonError('billing.errors.immediateAccessConsentRequired', 400);
    }

    if (user.currentPlan === 'PREMIUM') {
      return jsonError('billing.errors.alreadyOnPlan', 400);
    }

    if (user.currentPlan === 'PRO' && targetPlan === 'PRO') {
      return jsonError('billing.errors.alreadyPro', 400);
    }

    if (isPaidPlan(user.currentPlan) && targetPlan === 'PRO') {
      return jsonError('billing.errors.alreadyPro', 400);
    }

    const result = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      currency: parsed.data.currency,
      plan: targetPlan,
      immediateAccessConsent,
    });

    if ('error' in result) {
      return jsonError(result.error, 503);
    }

    return NextResponse.json({ url: result.url });
  } catch {
    return jsonError('billing.errors.checkoutUnavailable', 500);
  }
}
