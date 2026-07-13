import { JetBrains_Mono, Outfit } from 'next/font/google';
import { MeshBackground } from '@web/components/MeshBackground';
import { PostHogProvider } from '@web/features/analytics/components/PostHogProvider';
import { ToastProvider } from '@web/features/auth/components/ToastProvider';
import { LocaleProvider } from '@web/features/i18n/LocaleProvider';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${outfit.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <MeshBackground />
        <LocaleProvider>
          <PostHogProvider>
            {children}
            <ToastProvider />
          </PostHogProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
