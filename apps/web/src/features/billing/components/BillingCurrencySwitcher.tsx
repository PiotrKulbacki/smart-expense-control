'use client';

import { BILLING_CURRENCIES, type BillingCurrency } from '@shared/features/billing';

const BILLING_CURRENCY_STORAGE_KEY = 'sec_billing_currency';

type BillingCurrencySwitcherProps = {
  value: BillingCurrency;
  onChange: (currency: BillingCurrency) => void;
  persist?: boolean;
  className?: string;
};

export function readStoredBillingCurrency(): BillingCurrency | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(BILLING_CURRENCY_STORAGE_KEY);
  if (stored && BILLING_CURRENCIES.includes(stored as BillingCurrency)) {
    return stored as BillingCurrency;
  }

  return null;
}

export function writeStoredBillingCurrency(currency: BillingCurrency): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(BILLING_CURRENCY_STORAGE_KEY, currency);
}

export function BillingCurrencySwitcher({
  value,
  onChange,
  persist = true,
  className,
}: BillingCurrencySwitcherProps) {
  function handleSelect(currency: BillingCurrency) {
    onChange(currency);
    if (persist) {
      writeStoredBillingCurrency(currency);
    }
  }

  return (
    <div
      className={
        className ??
        'bg-elevated/50 inline-flex rounded-xl border border-[var(--border)] p-1 font-mono text-sm font-medium'
      }
      role="group"
      aria-label="Billing currency"
    >
      {BILLING_CURRENCIES.map((currency) => {
        const isActive = value === currency;
        return (
          <button
            key={currency}
            type="button"
            onClick={() => handleSelect(currency)}
            className={`rounded-lg px-3 py-1.5 transition ${
              isActive
                ? 'bg-warm/20 text-warm'
                : 'text-muted hover:bg-elevated hover:text-[var(--text)]'
            }`}
          >
            {currency}
          </button>
        );
      })}
    </div>
  );
}
