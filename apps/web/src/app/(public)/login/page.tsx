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
        <h1 className="text-center text-2xl font-bold text-gray-900">{t('auth.labels.login')}</h1>
        <Suspense fallback={null}>
          <AuthForm mode="login" />
        </Suspense>
        <p className="text-center text-sm text-gray-600">
          {t('auth.labels.noAccount')}{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            {t('auth.labels.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
