import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@smart-expense-control/database';
import { env } from '@web/env';
import { exchangeGoogleCode } from '@web/features/auth/lib/tokens';
import {
  createWebSession,
  setSessionCookie,
} from '@web/features/auth/services/auth.service';

const OAUTH_STATE_COOKIE = 'sec_oauth_state';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error || !code || !state) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/login?error=auth.errors.oauthFailed`,
      );
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/login?error=auth.errors.oauthFailed`,
      );
    }

    const googleProfile = await exchangeGoogleCode(code);

    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: googleProfile.providerAccountId,
        },
      },
      include: { user: true },
    });

    let user = account?.user;

    if (!user) {
      const existingUser = await prisma.user.findUnique({
        where: { email: googleProfile.email },
      });

      if (existingUser) {
        user = existingUser;
        await prisma.account.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerAccountId: googleProfile.providerAccountId,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: googleProfile.email,
            name: googleProfile.name,
            avatarUrl: googleProfile.avatarUrl,
            accounts: {
              create: {
                provider: 'google',
                providerAccountId: googleProfile.providerAccountId,
              },
            },
          },
        });
      }
    }

    const sessionToken = await createWebSession(user.id);

    const response = NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/`);
    setSessionCookie(response, sessionToken);

    response.cookies.set(OAUTH_STATE_COOKIE, '', { maxAge: 0, path: '/' });
    return response;
  } catch {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/login?error=auth.errors.oauthFailed`,
    );
  }
}
