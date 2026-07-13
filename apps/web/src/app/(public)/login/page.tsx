'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { AuthForm } from '@web/features/auth/components/AuthForm';
import { useT } from '@web/features/i18n/LocaleProvider';

export default function LoginPage() {
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
      <div className="w-full space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">
            {t('auth.labels.login')}
          </h1>
          <p className="text-muted mt-2 text-sm">{t('auth.labels.signIn')}</p>
        </div>
        <Suspense fallback={null}>
          <AuthForm mode="login" />
        </Suspense>
        <p className="text-muted text-center text-sm">
          {t('auth.labels.noAccount')}{' '}
          <Link href="/register" className="text-cool hover:text-warm font-medium">
            {t('auth.labels.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
