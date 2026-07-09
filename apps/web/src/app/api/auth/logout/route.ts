import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@web/features/auth/types';
import {
  jsonError,
  revokeRefreshToken,
  revokeSession,
} from '@web/features/auth/services/auth.service';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (sessionToken) {
      await revokeSession(sessionToken);
    }

    if (body.refreshToken) {
      await revokeRefreshToken(body.refreshToken);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
