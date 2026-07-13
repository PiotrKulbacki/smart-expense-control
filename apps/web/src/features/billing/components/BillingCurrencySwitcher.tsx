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
        'inline-flex rounded-xl border border-gray-300 bg-white p-1 text-sm font-medium'
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
              isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {currency}
          </button>
        );
      })}
    </div>
  );
}
