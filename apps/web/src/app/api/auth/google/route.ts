import { NextResponse } from 'next/server';
import { generateToken, getGoogleOAuthUrl } from '@web/features/auth/lib/tokens';

export async function GET() {
  const state = generateToken();
  const response = NextResponse.redirect(getGoogleOAuthUrl(state));

  response.cookies.set('sec_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
