import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'sec_session';

const AUTH_ONLY_PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/terms',
  '/privacy',
  '/impressum',
  '/contact',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  if (pathname.startsWith('/api/')) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionToken);
  const isPublic = isPublicPath(pathname);

  if (!isAuthenticated && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && AUTH_ONLY_PUBLIC_PATHS.includes(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  if (isAuthenticated && pathname === '/contact') {
    const appContactUrl = request.nextUrl.clone();
    appContactUrl.pathname = '/settings/contact';
    appContactUrl.search = '';
    return NextResponse.redirect(appContactUrl);
  }

  if (isAuthenticated && pathname === '/') {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)'],
};
