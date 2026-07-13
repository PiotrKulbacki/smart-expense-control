'use client';

import { useCallback, useEffect, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { BudgetProgress } from '@web/features/transactions/components/BudgetProgress';
import { CategoryDonutChart } from '@web/features/transactions/components/CategoryDonutChart';
import { DashboardCtas } from '@web/features/transactions/components/DashboardCtas';
import { DeleteTransactionDialog } from '@web/features/transactions/components/DeleteTransactionDialog';
import {
  RecentTransactionsList,
  type RecentTransaction,
} from '@web/features/transactions/components/RecentTransactionsList';
import { TransactionFormModal } from '@web/features/transactions/components/TransactionFormModal';
import type { TransactionFormInitialValues } from '@web/features/transactions/components/TransactionForm';
import type { ChartTransaction } from '@web/features/transactions/lib/chart-date-filter';

type DashboardSummary = {
  primaryCurrency: CurrencyCode;
  periodStart: string;
  totalSpent: number;
  billingPeriodTotalSpent: number;
  transactionCount: number;
  categoryTotals: Array<{ category: string; amount: number }>;
  currentMonthBudget: number | null;
};

type ScanQuota = {
  remaining: number;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toDateInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toFormInitialValues(transaction: RecentTransaction): TransactionFormInitialValues {
  return {
    amount: transaction.amount,
    currency: transaction.currency as CurrencyCode,
    category: transaction.category as TransactionFormInitialValues['category'],
    description: transaction.description ?? '',
    date: toDateInputValue(transaction.date),
  };
}

function buildDashboardUrl(customDateRange?: DateRange): string {
  if (!customDateRange?.from || !customDateRange?.to) {
    return '/api/dashboard';
  }

  const params = new URLSearchParams();
  params.set('from', startOfDay(customDateRange.from).toISOString());
  params.set('to', endOfDay(customDateRange.to).toISOString());
  return `/api/dashboard?${params.toString()}`;
}

export function DashboardView() {
  const t = useT();
  const { locale } = useLocale();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [chartTransactions, setChartTransactions] = useState<ChartTransaction[]>([]);
  const [scanQuota, setScanQuota] = useState<ScanQuota | null>(null);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecentTransaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadDashboard = useCallback(
    async (options?: { silent?: boolean; dateRange?: DateRange }) => {
      const silent = options?.silent ?? false;
      const dateRange = options?.dateRange;

      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const [dashboardResponse, quotaResponse] = await Promise.all([
          fetch(buildDashboardUrl(dateRange)),
          fetch('/api/ai/scan-quota'),
        ]);

        const dashboardData = (await dashboardResponse.json()) as {
          summary?: DashboardSummary;
          recentTransactions?: RecentTransaction[];
          chartTransactions?: ChartTransaction[];
          error?: string;
        };

        if (!dashboardResponse.ok) {
          toast.error(translateError(dashboardData.error ?? 'auth.errors.generic', locale));
          return;
        }

        setSummary(dashboardData.summary ?? null);
        setTransactions(dashboardData.recentTransactions ?? []);
        setChartTransactions(dashboardData.chartTransactions ?? []);

        if (quotaResponse.ok) {
          const quotaData = (await quotaResponse.json()) as {
            quota?: { remaining: number };
          };
          setScanQuota(quotaData.quota ? { remaining: quotaData.quota.remaining } : null);
        }
      } catch {
        toast.error(t('auth.errors.networkError'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [locale, t]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function handleCustomRangeApply(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      setCustomDateRange(range);
      void loadDashboard({ silent: true, dateRange: range });
      return;
    }

    if (!range && customDateRange) {
      setCustomDateRange(undefined);
      void loadDashboard({ silent: true });
    }
  }

  function openCreateForm() {
    setEditingTransaction(null);
    setIsFormOpen(true);
  }

  function openEditForm(transaction: RecentTransaction) {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open);
    if (!open) {
      setEditingTransaction(null);
    }
  }

  function openDeleteDialog(transactionId: string) {
    setDeletingTransactionId(transactionId);
    setIsDeleteDialogOpen(true);
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingTransactionId(null);
    }
  }

  function handleBudgetUpdated(budget: number | null) {
    setSummary((current) => (current ? { ...current, currentMonthBudget: budget } : current));
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 w-72 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-72 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{t('dashboard.subtitle')}</p>
        </div>
        <DashboardCtas onAddManual={openCreateForm} scanQuota={scanQuota} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('dashboard.summary.totalSpent')}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatMoney(summary.totalSpent, summary.primaryCurrency, locale)}
          </p>
          <BudgetProgress
            totalSpent={summary.billingPeriodTotalSpent}
            currentMonthBudget={summary.currentMonthBudget}
            primaryCurrency={summary.primaryCurrency}
            locale={locale}
            onBudgetUpdated={handleBudgetUpdated}
          />
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('dashboard.summary.transactions')}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.transactionCount}</p>
        </article>
      </section>

      <CategoryDonutChart
        chartTransactions={chartTransactions}
        periodStart={summary.periodStart}
        primaryCurrency={summary.primaryCurrency}
        locale={locale}
        customDateRange={customDateRange}
        onCustomRangeChange={handleCustomRangeApply}
      />

      <RecentTransactionsList
        transactions={transactions}
        primaryCurrency={summary.primaryCurrency}
        locale={locale}
        isRefreshing={isRefreshing}
        onEdit={openEditForm}
        onDelete={openDeleteDialog}
        onAddFirst={openCreateForm}
      />

      <TransactionFormModal
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        primaryCurrency={summary.primaryCurrency}
        transactionId={editingTransaction?.id}
        initialValues={editingTransaction ? toFormInitialValues(editingTransaction) : undefined}
        onSuccess={() => void loadDashboard({ silent: true, dateRange: customDateRange })}
      />

      <DeleteTransactionDialog
        transactionId={deletingTransactionId}
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onSuccess={() => void loadDashboard({ silent: true, dateRange: customDateRange })}
      />
    </div>
  );
}
