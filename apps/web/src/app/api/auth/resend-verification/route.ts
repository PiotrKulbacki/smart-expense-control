import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@shared/features/auth/schemas';
import { jsonError } from '@web/features/auth/services/auth.service';
import { resendEmailVerification } from '@web/features/auth/services/password-reset.service';
import { checkAuthRateLimit } from '@web/lib/rate-limit';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const rateLimit = await checkAuthRateLimit(request, 'resend-verification');
    if (!rateLimit.allowed) {
      return jsonError(RATE_LIMIT_ERROR, 429);
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    await resendEmailVerification(parsed.data.email, { locale: parsed.data.locale });

    // Always succeed to avoid email enumeration.
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
