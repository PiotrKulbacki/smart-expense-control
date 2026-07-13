'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type DashboardSummary = {
  primaryCurrency: string;
  totalSpent: number;
  transactionCount: number;
  categoryTotals: Array<{ category: string; amount: number }>;
};

type DashboardTransaction = {
  id: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: string;
  description: string | null;
  date: string;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function DashboardView() {
  const t = useT();
  const { locale } = useLocale();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch('/api/dashboard');
        const data = (await response.json()) as {
          summary?: DashboardSummary;
          recentTransactions?: DashboardTransaction[];
          error?: string;
        };

        if (!response.ok) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        setSummary(data.summary ?? null);
        setTransactions(data.recentTransactions ?? []);
      } catch {
        toast.error(t('auth.errors.networkError'));
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [locale, t]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('dashboard.summary.totalSpent')}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatMoney(summary.totalSpent, summary.primaryCurrency, locale)}
          </p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('dashboard.summary.transactions')}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.transactionCount}</p>
        </article>
      </section>

      {summary.categoryTotals.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.categories.title')}</h2>
          <div className="mt-4 space-y-3">
            {summary.categoryTotals.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{item.category}</span>
                <span className="font-medium text-gray-900">
                  {formatMoney(item.amount, summary.primaryCurrency, locale)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recent.title')}</h2>
        {transactions.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{t('dashboard.recent.empty')}</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {transactions.map((transaction) => (
              <article key={transaction.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.description ?? transaction.category}
                  </p>
                  <p className="text-xs text-gray-500">
                    {transaction.category} · {new Date(transaction.date).toLocaleDateString(locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatMoney(transaction.convertedAmount, summary.primaryCurrency, locale)}
                  </p>
                  {transaction.currency !== summary.primaryCurrency && (
                    <p className="text-xs text-gray-500">
                      {formatMoney(transaction.amount, transaction.currency, locale)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
