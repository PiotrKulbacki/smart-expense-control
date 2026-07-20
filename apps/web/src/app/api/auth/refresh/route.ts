import { NextResponse } from 'next/server';
import { prisma } from '@lyamo/database';
import { hashToken, signAccessToken } from '@web/features/auth/lib/tokens';
import { jsonError, toSafeUser } from '@web/features/auth/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { refreshToken?: string };

    if (!body.refreshToken) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: hashToken(body.refreshToken) },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return jsonError('auth.errors.sessionExpired', 401);
    }

    const accessToken = await signAccessToken(stored.userId);

    return NextResponse.json({
      user: toSafeUser(stored.user),
      accessToken,
      refreshToken: body.refreshToken,
    });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
