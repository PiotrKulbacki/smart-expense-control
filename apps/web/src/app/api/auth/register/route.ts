import { NextResponse } from 'next/server';
import { registerSchema } from '@shared/features/auth/schemas';
import { getFinancialMonthStartDayFromDate } from '@shared/features/billing/financial-month';
import { prisma } from '@lyamo/database';
import {
  buildAuthResponse,
  createMobileTokens,
  createWebSession,
  hashPassword,
  isMobileClient,
  jsonError,
  setSessionCookie,
  toSafeUser,
} from '@web/features/auth/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.acceptedLegal) {
      return jsonError('auth.errors.legalAcceptanceRequired', 400);
    }

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const { email, password, name } = parsed.data;

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
      },
    });

    const safeUser = toSafeUser(user);
    const mobile = isMobileClient(request);

    if (mobile) {
      const tokens = await createMobileTokens(user.id);
      return NextResponse.json(buildAuthResponse(safeUser, tokens), { status: 201 });
    }

    const sessionToken = await createWebSession(user.id);
    const response = NextResponse.json(buildAuthResponse(safeUser), { status: 201 });
    setSessionCookie(response, sessionToken);
    return response;
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
