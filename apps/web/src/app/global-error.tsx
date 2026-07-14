'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import { DEFAULT_LOCALE, isLocale, t, type Locale } from '@shared/features/i18n';

const LOCALE_COOKIE = 'sec_locale';

function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1];

  if (value && isLocale(value)) {
    return value;
  }

  return DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  return (
    <html lang={locale} className="dark">
      <body className="bg-void flex min-h-screen items-center justify-center p-8">
        <div className="panel max-w-md p-8 text-center">
          <h1 className="font-display relative z-10 text-2xl font-bold text-[var(--text)]">
            {t('globalError.title', locale)}
          </h1>
          <p className="text-muted relative z-10 mt-2 text-sm">
            {t('globalError.message', locale)}
          </p>
          <button type="button" onClick={reset} className="btn-primary relative z-10 mt-6">
            {t('globalError.retry', locale)}
          </button>
        </div>
      </body>
    </html>
  );
}
