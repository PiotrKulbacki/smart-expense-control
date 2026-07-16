import { JetBrains_Mono, Outfit } from 'next/font/google';
import { cookies } from 'next/headers';
import { MeshBackground } from '@web/components/MeshBackground';
import { PostHogProvider } from '@web/features/analytics/components/PostHogProvider';
import { ToastProvider } from '@web/features/auth/components/ToastProvider';
import { CategoriesProvider } from '@web/features/categories/components/CategoriesProvider';
import { CookieConsentProvider } from '@web/features/cookie-consent';
import { LocaleProvider } from '@web/features/i18n/LocaleProvider';
import { QueryProvider } from '@web/features/query/QueryProvider';
import { DEFAULT_LOCALE, isLocale } from '@shared/features/i18n';
import type { Metadata } from 'next';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Smart Expense Control',
  description: 'Financial management with AI-powered insights',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('sec_locale')?.value;
  const initialLocale = localeCookie && isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  return (
    <html
      lang={initialLocale}
      className={`dark ${outfit.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <MeshBackground />
        <LocaleProvider initialLocale={initialLocale}>
          <CookieConsentProvider>
            <QueryProvider>
              <CategoriesProvider>
                <PostHogProvider>
                  {children}
                  <ToastProvider />
                </PostHogProvider>
              </CategoriesProvider>
            </QueryProvider>
          </CookieConsentProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
