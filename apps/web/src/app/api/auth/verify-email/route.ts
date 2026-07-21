import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_ERROR_CODES } from '@shared/features/auth/schemas';
import { jsonError } from '@web/features/auth/services/auth.service';
import { verifyEmailWithToken } from '@web/features/auth/services/password-reset.service';
import { checkAuthRateLimit } from '@web/lib/rate-limit';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

const verifyEmailSchema = z.object({
  token: z.string().min(1, AUTH_ERROR_CODES.INVALID_VERIFICATION_TOKEN),
});

export async function POST(request: Request) {
  try {
    const rateLimit = await checkAuthRateLimit(request, 'verify-email');
    if (!rateLimit.allowed) {
      return jsonError(RATE_LIMIT_ERROR, 429);
    }

    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('auth.errors.invalidVerificationToken', 400);
    }

    const ok = await verifyEmailWithToken(parsed.data.token);
    if (!ok) {
      return jsonError('auth.errors.invalidVerificationToken', 400);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
