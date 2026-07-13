import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { createBillingPortalSession } from '@web/features/billing/services/stripe-checkout.service';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    if (!user.stripeCustomerId) {
      return jsonError('billing.errors.noSubscription', 400);
    }

    const result = await createBillingPortalSession(user.stripeCustomerId);

    if ('error' in result) {
      return jsonError(result.error, 503);
    }

    return NextResponse.json({ url: result.url });
  } catch {
    return jsonError('billing.errors.portalUnavailable', 500);
  }
}
