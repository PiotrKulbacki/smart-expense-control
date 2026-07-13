'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { isBillingCurrency } from '@shared/features/billing';
import { AuthForm } from '@web/features/auth/components/AuthForm';
import { writeStoredBillingCurrency } from '@web/features/billing/components/BillingCurrencySwitcher';
import { useT } from '@web/features/i18n/LocaleProvider';

function RegisterCurrencySync() {
  const searchParams = useSearchParams();
  const currency = searchParams.get('currency');

  useEffect(() => {
    if (currency && isBillingCurrency(currency)) {
      writeStoredBillingCurrency(currency);
    }
  }, [currency]);

  return null;
}

export default function RegisterPage() {
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
      <Suspense fallback={null}>
        <RegisterCurrencySync />
      </Suspense>
      <div className="w-full space-y-6">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          {t('auth.labels.register')}
        </h1>
        <Suspense fallback={null}>
          <AuthForm mode="register" />
        </Suspense>
        <p className="text-center text-sm text-gray-600">
          {t('auth.labels.hasAccount')}{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            {t('auth.labels.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
