import { NextResponse } from 'next/server';
import { resetPasswordSchema } from '@shared/features/auth/schemas';
import { hashPassword, jsonError } from '@web/features/auth/services/auth.service';
import { resetPasswordWithToken } from '@web/features/auth/services/password-reset.service';
import { checkAuthRateLimit } from '@web/lib/rate-limit';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const rateLimit = await checkAuthRateLimit(request, 'reset-password');
    if (!rateLimit.allowed) {
      return jsonError(RATE_LIMIT_ERROR, 429);
    }

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const ok = await resetPasswordWithToken(parsed.data.token, passwordHash);

    if (!ok) {
      return jsonError('auth.errors.invalidResetToken', 400);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
