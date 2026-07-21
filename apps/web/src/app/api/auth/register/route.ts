import { NextResponse } from 'next/server';
import { registerSchema } from '@shared/features/auth/schemas';
import { getFinancialMonthStartDayFromDate } from '@shared/features/billing/financial-month';
import { prisma } from '@lyamo/database';
import { hashPassword, jsonError } from '@web/features/auth/services/auth.service';
import { createAndSendEmailVerification } from '@web/features/auth/services/password-reset.service';
import { checkAuthRateLimit } from '@web/lib/rate-limit';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const rateLimit = await checkAuthRateLimit(request, 'register');
    if (!rateLimit.allowed) {
      return jsonError(RATE_LIMIT_ERROR, 429);
    }

    const body = await request.json();

    if (!body.acceptedLegal) {
      return jsonError('auth.errors.legalAcceptanceRequired', 400);
    }

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const { email, password, name, locale } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return jsonError('auth.errors.userExists', 409);
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? null,
        financialMonthStartDay: getFinancialMonthStartDayFromDate(now),
        lastQuotaResetAt: now,
        emailVerifiedAt: null,
      },
    });

    await createAndSendEmailVerification(user.id, user.email, {
      locale,
      name: user.name,
    });

    // Hard gate (D1): no session / tokens until email is verified.
    return NextResponse.json(
      {
        requiresEmailVerification: true,
        email: user.email,
      },
      { status: 201 }
    );
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
