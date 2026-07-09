import { prisma } from '@smart-expense-control/database';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  REFRESH_TOKEN_DURATION_MS,
  SESSION_DURATION_MS,
  type AuthResponse,
  type SafeUser,
  toSafeUser,
} from '@web/features/auth/types';
import {
  generateToken,
  hashToken,
  signAccessToken,
} from '@web/features/auth/lib/tokens';

export { toSafeUser };

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createWebSession(userId: string): Promise<string> {
  const token = generateToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { userId, token: hashedToken, expiresAt },
  });

  return token;
}

export async function createMobileTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = await signAccessToken(userId);
  const refreshToken = generateToken();
  const hashedRefreshToken = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION_MS);

  await prisma.refreshToken.create({
    data: { userId, token: hashedRefreshToken, expiresAt },
  });

  return { accessToken, refreshToken };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function buildAuthResponse(
  user: SafeUser,
  tokens?: { accessToken: string; refreshToken: string },
): AuthResponse {
  return tokens ? { user, ...tokens } : { user };
}

export async function getUserFromSession(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: hashToken(sessionToken) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return toSafeUser(session.user);
}

export async function getUserFromBearerToken(
  authorizationHeader: string | null,
): Promise<SafeUser | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice(7);
  const { verifyAccessToken } = await import('@web/features/auth/lib/tokens');
  const userId = await verifyAccessToken(token);

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toSafeUser(user) : null;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token: hashToken(token) },
  });
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token: hashToken(token) },
  });
}

export function isMobileClient(request: Request): boolean {
  return request.headers.get('x-client-platform') === 'mobile';
}

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}
