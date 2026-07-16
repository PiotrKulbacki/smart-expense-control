'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { SUPPORTED_CURRENCIES } from '@shared/features/currency';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
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
import { PlanPriceDisplay } from '@web/features/billing/components/ProPriceDisplay';
import type { CheckoutPlan } from '@shared/features/billing';
import { ProUpgradeCycleDayDialog } from '@web/features/billing/components/ProUpgradeCycleDayDialog';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { RecurringExpensesSection } from '@web/features/settings/components/RecurringExpensesSection';
import { CategoriesSection } from '@web/features/settings/components/CategoriesSection';
import { CategoryLimitsSection } from '@web/features/settings/components/CategoryLimitsSection';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { SettingsLoadingSkeleton } from '@web/features/layout/components/RouteLoadingSkeletons';

type SettingsViewProps = {
  initialUser: SafeUser;
};

export function SettingsView({ initialUser }: SettingsViewProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const [user, setUser] = useState<SafeUser | null>(initialUser);
  const [name, setName] = useState(initialUser.name ?? '');
  const [primaryCurrency, setPrimaryCurrency] = useState<CurrencyCode>(initialUser.primaryCurrency);
  const [financialMonthStartDay, setFinancialMonthStartDay] = useState(
    initialUser.financialMonthStartDay
  );
  const [defaultMonthlyBudget, setDefaultMonthlyBudget] = useState(
    initialUser.defaultMonthlyBudget != null ? String(initialUser.defaultMonthlyBudget) : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [checkoutCurrency, setCheckoutCurrency] = useState<BillingCurrency>(
    () => readStoredBillingCurrency() ?? initialUser.primaryCurrency
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [cycleDayModal, setCycleDayModal] = useState<{
    previousDay: number;
    currentDay: number;
  } | null>(null);
  const [isCycleDayModalOpen, setIsCycleDayModalOpen] = useState(false);
  const checkoutToastShown = useRef(false);

  const loadCycleDayChoiceStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/billing/pro-upgrade-cycle-day');
      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as {
        pending?: boolean;
        previousDay?: number | null;
        currentDay?: number | null;
      };

      if (
        data.pending &&
        data.previousDay != null &&
        data.currentDay != null &&
        data.previousDay !== data.currentDay
      ) {
        setCycleDayModal({ previousDay: data.previousDay, currentDay: data.currentDay });
        setIsCycleDayModalOpen(true);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }, []);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout || checkoutToastShown.current) {
      return;
    }

    checkoutToastShown.current = true;

    if (checkout === 'success') {
      setIsCheckoutSuccess(true);
      toast.success(t('billing.success.upgraded'));
    } else if (checkout === 'cancel') {
      toast.error(t('billing.errors.checkoutCancelled'));
    }

    router.replace('/settings', { scroll: false });
  }, [searchParams, t, router]);

  useEffect(() => {
    setCheckoutCurrency(readStoredBillingCurrency() ?? initialUser.primaryCurrency);
  }, [initialUser.primaryCurrency]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadCycleDayChoiceStatus();
  }, [user, loadCycleDayChoiceStatus]);

  useEffect(() => {
    if (!isCheckoutSuccess) {
      return;
    }

    let cancelled = false;

    async function pollForCycleDayChoice() {
      for (let attempt = 0; attempt < 30 && !cancelled; attempt += 1) {
        const found = await loadCycleDayChoiceStatus();
        if (found) {
          return;
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    }

    void pollForCycleDayChoice();

    return () => {
      cancelled = true;
    };
  }, [isCheckoutSuccess, loadCycleDayChoiceStatus]);

  function handleCycleDayConfirmed(day: number) {
    setFinancialMonthStartDay(day);
    setUser((current) => (current ? { ...current, financialMonthStartDay: day } : current));
    setCycleDayModal(null);
    router.refresh();
  }

  async function handleSave(event: { preventDefault(): void }) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const parsedBudget = defaultMonthlyBudget.trim() ? Number(defaultMonthlyBudget) : null;

      if (defaultMonthlyBudget.trim() && (!Number.isFinite(parsedBudget) || parsedBudget! <= 0)) {
        toast.error(t('settings.errors.invalidBudget'));
        setIsSaving(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          primaryCurrency,
          financialMonthStartDay,
          ...(defaultMonthlyBudget.trim()
            ? { defaultMonthlyBudget: parsedBudget }
            : { defaultMonthlyBudget: null }),
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

  async function handleUpgrade(plan: CheckoutPlan) {
    setIsBillingLoading(true);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: checkoutCurrency, plan }),
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
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">
          {t('settings.title')}
        </h1>
        <p className="text-muted mt-1 text-sm">{t('settings.subtitle')}</p>
      </div>

      <form onSubmit={(event) => void handleSave(event)} className="space-y-6">
        <section className="panel relative z-10 p-6">
          <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
            {t('settings.profile.title')}
          </h2>
          <div className="relative z-10 mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="auth-label">{t('auth.labels.name')}</span>
              <input
                type="text"
                value={name}
                disabled={isSaving}
                onChange={(event) => setName(event.target.value)}
                className="auth-input"
              />
            </label>
            <label className="block text-sm">
              <span className="auth-label">{t('settings.labels.primaryCurrency')}</span>
              <select
                value={primaryCurrency}
                disabled={isSaving}
                onChange={(event) =>
                  setPrimaryCurrency(event.target.value as typeof primaryCurrency)
                }
                className="auth-input"
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="auth-label">{t('settings.labels.financialMonthStartDay')}</span>
              <input
                type="number"
                min={FINANCIAL_MONTH_DAY_MIN}
                max={FINANCIAL_MONTH_DAY_MAX}
                value={financialMonthStartDay}
                disabled={isSaving}
                onChange={(event) => setFinancialMonthStartDay(Number(event.target.value))}
                className="auth-input"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="auth-label">{t('settings.labels.defaultMonthlyBudget')}</span>
              <input
                type="number"
                min={1}
                step="0.01"
                value={defaultMonthlyBudget}
                disabled={isSaving}
                onChange={(event) => setDefaultMonthlyBudget(event.target.value)}
                placeholder={t('settings.labels.defaultMonthlyBudgetPlaceholder')}
                className="auth-input"
              />
              <p className="text-muted mt-1 text-xs">
                {t('settings.labels.defaultMonthlyBudgetHint')}
              </p>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary relative z-10 mt-6 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSaving && <LoadingSpinner />}
            {t('settings.labels.saveChanges')}
          </button>
        </section>
      </form>

      <CategoriesSection />

      <CategoryLimitsSection primaryCurrency={primaryCurrency} />

      <RecurringExpensesSection primaryCurrency={primaryCurrency} />

      <section className="panel relative z-10 p-6">
        <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
          {t('billing.labels.subscription')}
        </h2>
        <p className="text-muted relative z-10 mt-2 text-sm">
          {t('billing.labels.currentPlan', { plan: user.currentPlan })}
        </p>
        {user.currentPlan !== 'PREMIUM' && (
          <>
            <div className="relative z-10 mt-4 space-y-6">
              {user.currentPlan === 'FREE' && (
                <div>
                  <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--text)]">
                    PRO
                  </p>
                  <PlanPriceDisplay plan="PRO" currency={checkoutCurrency} />
                </div>
              )}
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--text)]">
                  PREMIUM
                </p>
                <PlanPriceDisplay plan="PREMIUM" currency={checkoutCurrency} />
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <p className="mb-2 text-sm font-medium text-[var(--text)]">
                {t('billing.labels.paymentCurrency')}
              </p>
              <BillingCurrencySwitcher value={checkoutCurrency} onChange={setCheckoutCurrency} />
            </div>
          </>
        )}
        <div className="relative z-10 mt-4 flex flex-wrap gap-3">
          {user.currentPlan === 'FREE' && (
            <button
              type="button"
              disabled={isBillingLoading}
              onClick={() => void handleUpgrade('PRO')}
              className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isBillingLoading && <LoadingSpinner />}
              {t('billing.labels.upgradeToPro')}
            </button>
          )}
          {user.currentPlan !== 'PREMIUM' && (
            <button
              type="button"
              disabled={isBillingLoading}
              onClick={() => void handleUpgrade('PREMIUM')}
              className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isBillingLoading && <LoadingSpinner />}
              {t('billing.labels.upgradeToPremium')}
            </button>
          )}
          {user.currentPlan !== 'FREE' && (
            <button
              type="button"
              disabled={isBillingLoading}
              onClick={() => void handleManageSubscription()}
              className="btn-ghost inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBillingLoading && <LoadingSpinner />}
              {t('billing.labels.manageSubscription')}
            </button>
          )}
        </div>
      </section>

      <section className="panel border-glow/30 relative z-10 p-6">
        <h2 className="font-display text-glow relative z-10 text-lg font-semibold">
          {t('settings.danger.title')}
        </h2>
        <p className="text-muted relative z-10 mt-2 text-sm">{t('settings.danger.description')}</p>
        <p className="text-muted border-border/60 bg-elevated/40 relative z-10 mt-3 rounded-xl border px-3 py-2 text-sm leading-6">
          {t('settings.danger.inactiveAccountNotice')}
        </p>
        <label className="relative z-10 mt-4 block text-sm">
          <span className="auth-label text-glow">
            {t('settings.danger.confirmLabel', { email: user.email })}
          </span>
          <input
            type="email"
            value={deleteConfirmation}
            disabled={isDeleting}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            className="auth-input border-glow/30 focus:border-glow/50 focus:ring-glow/20"
          />
        </label>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => void handleDeleteAccount()}
          className="bg-glow text-void hover:bg-glow/90 relative z-10 mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-mono text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting && <LoadingSpinner />}
          {t('settings.danger.deleteAccount')}
        </button>
      </section>

      {cycleDayModal && (
        <ProUpgradeCycleDayDialog
          open={isCycleDayModalOpen}
          previousDay={cycleDayModal.previousDay}
          currentDay={cycleDayModal.currentDay}
          onOpenChange={setIsCycleDayModalOpen}
          onConfirmed={handleCycleDayConfirmed}
        />
      )}
    </div>
  );
}
