import { NextResponse } from 'next/server';
import { changePasswordSchema } from '@shared/features/auth/schemas';
import { prisma } from '@lyamo/database';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { hashPassword, jsonError, verifyPassword } from '@web/features/auth/services/auth.service';
import { checkAuthRateLimit } from '@web/lib/rate-limit';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const rateLimit = await checkAuthRateLimit(request, 'change-password', user.id);
    if (!rateLimit.allowed) {
      return jsonError(RATE_LIMIT_ERROR, 429);
    }

    if (!user.hasPassword) {
      return jsonError('auth.errors.oauthPasswordChangeUnavailable', 400);
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.passwordHash) {
      return jsonError('auth.errors.oauthPasswordChangeUnavailable', 400);
    }

    const isValid = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return jsonError('auth.errors.currentPasswordIncorrect', 400);
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
