'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import {
  FINANCIAL_MONTH_DAY_MAX,
  FINANCIAL_MONTH_DAY_MIN,
} from '@shared/features/billing/financial-month';
import type { BillingCurrency } from '@shared/features/billing';
import type { SafeUser } from '@web/features/auth/types';
import {
  BillingCurrencySwitcher,
  readStoredBillingCurrency,
} from '@web/features/billing/components/BillingCurrencySwitcher';
import { ProPriceDisplay } from '@web/features/billing/components/ProPriceDisplay';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

export function SettingsView() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [name, setName] = useState('');
  const [primaryCurrency, setPrimaryCurrency] = useState<'PLN' | 'EUR' | 'GBP'>('PLN');
  const [financialMonthStartDay, setFinancialMonthStartDay] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [checkoutCurrency, setCheckoutCurrency] = useState<BillingCurrency>('PLN');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success(t('billing.success.upgraded'));
    } else if (checkout === 'cancel') {
      toast.error(t('billing.errors.checkoutCancelled'));
    }
  }, [searchParams, t]);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me');
        const data = (await response.json()) as { user?: SafeUser; error?: string };

        if (!response.ok || !data.user) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        setUser(data.user);
        setName(data.user.name ?? '');
        setPrimaryCurrency(data.user.primaryCurrency);
        setFinancialMonthStartDay(data.user.financialMonthStartDay);
        setCheckoutCurrency(readStoredBillingCurrency() ?? data.user.primaryCurrency);
      } catch {
        toast.error(t('auth.errors.networkError'));
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, [locale, t]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          primaryCurrency,
          financialMonthStartDay,
        }),
      });

      const data = (await response.json()) as { user?: SafeUser; error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'settings.errors.updateFailed', locale));
        return;
      }

      if (data.user) {
        setUser(data.user);
      }

      toast.success(t('settings.success.updated'));
      router.refresh();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpgrade() {
    setIsBillingLoading(true);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: checkoutCurrency }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        toast.error(translateError(data.error ?? 'billing.errors.checkoutUnavailable', locale));
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsBillingLoading(false);
    }
  }

  async function handleManageSubscription() {
    setIsBillingLoading(true);

    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        toast.error(translateError(data.error ?? 'billing.errors.portalUnavailable', locale));
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsBillingLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== user?.email) {
      toast.error(t('settings.errors.confirmEmailMismatch'));
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/auth/me', { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'settings.errors.deleteFailed', locale));
        return;
      }

      toast.success(t('settings.success.accountDeleted'));
      router.push('/');
      router.refresh();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('settings.subtitle')}</p>
      </div>

      <form onSubmit={(event) => void handleSave(event)} className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.profile.title')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">{t('auth.labels.name')}</span>
              <input
                type="text"
                value={name}
                disabled={isSaving}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                {t('settings.labels.primaryCurrency')}
              </span>
              <select
                value={primaryCurrency}
                disabled={isSaving}
                onChange={(event) =>
                  setPrimaryCurrency(event.target.value as typeof primaryCurrency)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              >
                {(['PLN', 'EUR', 'GBP'] as const).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                {t('settings.labels.financialMonthStartDay')}
              </span>
              <input
                type="number"
                min={FINANCIAL_MONTH_DAY_MIN}
                max={FINANCIAL_MONTH_DAY_MAX}
                value={financialMonthStartDay}
                disabled={isSaving}
                onChange={(event) => setFinancialMonthStartDay(Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {t('settings.labels.saveChanges')}
          </button>
        </section>
      </form>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t('billing.labels.subscription')}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {t('billing.labels.currentPlan', { plan: user.currentPlan })}
        </p>
        {user.currentPlan === 'FREE' && (
          <>
            <div className="mt-4">
              <ProPriceDisplay currency={checkoutCurrency} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                {t('billing.labels.paymentCurrency')}
              </p>
              <BillingCurrencySwitcher value={checkoutCurrency} onChange={setCheckoutCurrency} />
            </div>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {user.currentPlan === 'FREE' ? (
            <button
              type="button"
              disabled={isBillingLoading}
              onClick={() => void handleUpgrade()}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {t('billing.labels.upgradeToPro')}
            </button>
          ) : (
            <button
              type="button"
              disabled={isBillingLoading}
              onClick={() => void handleManageSubscription()}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {t('billing.labels.manageSubscription')}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">{t('settings.danger.title')}</h2>
        <p className="mt-2 text-sm text-red-800">{t('settings.danger.description')}</p>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-red-900">
            {t('settings.danger.confirmLabel', { email: user.email })}
          </span>
          <input
            type="email"
            value={deleteConfirmation}
            disabled={isDeleting}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => void handleDeleteAccount()}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {t('settings.danger.deleteAccount')}
        </button>
      </section>
    </div>
  );
}
