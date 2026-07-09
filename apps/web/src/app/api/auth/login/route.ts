import { NextResponse } from 'next/server';
import { loginSchema } from '@shared/features/auth/schemas';
import { prisma } from '@smart-expense-control/database';
import {
  buildAuthResponse,
  createMobileTokens,
  createWebSession,
  isMobileClient,
  jsonError,
  setSessionCookie,
  toSafeUser,
  verifyPassword,
} from '@web/features/auth/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      return jsonError('auth.errors.invalidCredentials', 401);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return jsonError('auth.errors.invalidCredentials', 401);
    }

    const safeUser = toSafeUser(user);
    const mobile = isMobileClient(request);

    if (mobile) {
      const tokens = await createMobileTokens(user.id);
      return NextResponse.json(buildAuthResponse(safeUser, tokens));
    }

    const sessionToken = await createWebSession(user.id);
    const response = NextResponse.json(buildAuthResponse(safeUser));
    setSessionCookie(response, sessionToken);
    return response;
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
