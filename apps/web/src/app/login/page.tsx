import { Suspense } from 'react';
import Link from 'next/link';
import { DEFAULT_LOCALE, t } from '@shared/features/i18n';
import { AuthForm } from '@web/features/auth/components/AuthForm';

export default function LoginPage() {
  const locale = DEFAULT_LOCALE;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          {t('auth.labels.login', locale)}
        </h1>
        <Suspense fallback={null}>
          <AuthForm mode="login" />
        </Suspense>
        <p className="text-center text-sm text-gray-600">
          {t('auth.labels.noAccount', locale)}{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            {t('auth.labels.signUp', locale)}
          </Link>
        </p>
      </div>
    </main>
  );
}
