'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthForm } from '@web/features/auth/components/AuthForm';
import { useT } from '@web/features/i18n/LocaleProvider';

export default function LoginPage() {
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
      <Link
        href="/"
        className="text-muted hover:text-warm mb-8 inline-flex items-center gap-2 font-mono text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {t('legal.backToHome')}
      </Link>

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
