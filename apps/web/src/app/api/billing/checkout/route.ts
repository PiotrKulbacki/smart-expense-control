import { NextResponse } from 'next/server';
import { checkoutRequestSchema } from '@shared/features/billing';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { createCheckoutSession } from '@web/features/billing/services/stripe-checkout.service';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    if (user.currentPlan === 'PRO') {
      return jsonError('billing.errors.alreadyPro', 400);
    }

    const body = await request.json();
    const parsed = checkoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('billing.errors.invalidCurrency', 400);
    }

    const result = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      currency: parsed.data.currency,
    });

    if ('error' in result) {
      return jsonError(result.error, 503);
    }

    return NextResponse.json({ url: result.url });
  } catch {
    return jsonError('billing.errors.checkoutUnavailable', 500);
  }
}
