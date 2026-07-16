'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { toCalendarDateInputValue } from '@shared/features/transactions/schemas';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { useCategories } from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { BudgetProgress } from '@web/features/transactions/components/BudgetProgress';
import { CategoryDonutChart } from '@web/features/transactions/components/CategoryDonutChart';
import { DashboardCtas } from '@web/features/transactions/components/DashboardCtas';
import { DeleteTransactionDialog } from '@web/features/transactions/components/DeleteTransactionDialog';
import { DeleteTransactionGroupDialog } from '@web/features/transactions/components/DeleteTransactionGroupDialog';
import { EditTransactionGroupDialog } from '@web/features/transactions/components/EditTransactionGroupDialog';
import {
  RecentTransactionsList,
  type RecentTransaction,
} from '@web/features/transactions/components/RecentTransactionsList';
import type { SplitTransactionGroup } from '@web/features/transactions/lib/transaction-groups';
import { TransactionFormModal } from '@web/features/transactions/components/TransactionFormModal';
import type { TransactionFormInitialValues } from '@web/features/transactions/components/TransactionForm';
import {
  aggregateCategoryTotals,
  getChartFilterDayMetrics,
  getChartRangeStart,
  type ChartDateRange,
  type ChartTransaction,
} from '@web/features/transactions/lib/chart-date-filter';
import { computeDailyBudgetStats } from '@web/features/dashboard/lib/dashboard-daily-stats';
import { countLogicalTransactions } from '@web/features/dashboard/lib/transaction-counts';
import { TransactionsInsightsCard } from '@web/features/dashboard/components/TransactionsInsightsCard';

type DashboardSummary = {
  primaryCurrency: CurrencyCode;
  financialMonthStartDay: number;
  periodStart: string;
  periodEnd: string;
  totalSpent: number;
  billingPeriodTotalSpent: number;
  transactionCount: number;
  transactionStats?: {
    total: number;
    manual: number;
    scanned: number;
  };
  categoryTotals: Array<{ category: string; amount: number }>;
  currentMonthBudget: number | null;
  noSpendDays?: {
    noSpendDays: number;
    totalDays: number;
    ratio: string;
  };
};

type ScanQuota = {
  used: number;
  limit: number;
  remaining: number;
};

type UserPlan = 'FREE' | 'PRO';

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toDateInputValue(isoDate: string): string {
  return toCalendarDateInputValue(isoDate);
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
  const { colorMap, nameMap } = useCategories();
  const categoryDisplayContext = useMemo(() => ({ colorMap, nameMap }), [colorMap, nameMap]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [chartTransactions, setChartTransactions] = useState<ChartTransaction[]>([]);
  const [scanQuota, setScanQuota] = useState<ScanQuota | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan>('FREE');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [filterSelection, setFilterSelection] = useState<ChartDateRange>('period');
  const [appliedFilter, setAppliedFilter] = useState<ChartDateRange>('period');
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecentTransaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SplitTransactionGroup | null>(null);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);

  const categoryTotals = useMemo(() => {
    if (!summary) {
      return [];
    }

    return aggregateCategoryTotals(chartTransactions, appliedFilter, summary.periodStart);
  }, [chartTransactions, appliedFilter, summary]);

  const filteredRecentTransactions = useMemo(() => {
    if (!summary) {
      return transactions;
    }

    const rangeStart = getChartRangeStart(appliedFilter, summary.periodStart);
    const rangeEnd =
      appliedFilter === 'custom' && summary.periodEnd ? new Date(summary.periodEnd) : null;

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      if (transactionDate < rangeStart) {
        return false;
      }

      if (rangeEnd && transactionDate > rangeEnd) {
        return false;
      }

      return true;
    });
  }, [transactions, appliedFilter, summary]);

  const displayedTransactionStats = useMemo(() => {
    if (!summary) {
      return { total: 0, manual: 0, scanned: 0 };
    }

    if (appliedFilter === 'period' && !customDateRange) {
      return (
        summary.transactionStats ?? {
          total: summary.transactionCount,
          manual: 0,
          scanned: 0,
        }
      );
    }

    return countLogicalTransactions(
      filteredRecentTransactions.map((transaction) => ({
        receiptGroupId: transaction.receiptGroupId ?? null,
        isAiScanned: transaction.isAiScanned ?? false,
      }))
    );
  }, [summary, appliedFilter, customDateRange, filteredRecentTransactions]);

  const visibleTotalSpent = useMemo(
    () =>
      categoryTotals
        .filter((item) => !hiddenCategories.has(item.category))
        .reduce((sum, item) => sum + item.amount, 0),
    [categoryTotals, hiddenCategories]
  );

  const hiddenTotalSpent = useMemo(
    () =>
      categoryTotals
        .filter((item) => hiddenCategories.has(item.category))
        .reduce((sum, item) => sum + item.amount, 0),
    [categoryTotals, hiddenCategories]
  );

  const dailyStats = useMemo(() => {
    if (!summary) {
      return null;
    }

    const dayMetrics = getChartFilterDayMetrics({
      range: appliedFilter,
      periodStart: summary.periodStart,
      periodEnd: summary.periodEnd,
      financialMonthStartDay: summary.financialMonthStartDay,
    });

    return computeDailyBudgetStats({
      visibleTotalSpent,
      hiddenTotalSpent,
      currentMonthBudget: summary.currentMonthBudget,
      daysElapsed: dayMetrics.daysElapsed,
      daysUntilPayday: dayMetrics.daysUntilPayday,
    });
  }, [summary, appliedFilter, visibleTotalSpent, hiddenTotalSpent]);

  useEffect(() => {
    setHiddenCategories(new Set());
  }, [appliedFilter]);

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
            plan?: UserPlan;
            quota?: { used: number; limit: number; remaining: number };
          };
          setUserPlan(quotaData.plan ?? 'FREE');
          setScanQuota(
            quotaData.quota
              ? {
                  used: quotaData.quota.used,
                  limit: quotaData.quota.limit,
                  remaining: quotaData.quota.remaining,
                }
              : null
          );
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

  function toggleCategory(category: string) {
    setHiddenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
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

  function openDeleteGroupDialog(receiptGroupId: string) {
    setDeletingGroupId(receiptGroupId);
    setIsDeleteGroupDialogOpen(true);
  }

  function handleDeleteGroupDialogOpenChange(open: boolean) {
    setIsDeleteGroupDialogOpen(open);
    if (!open) {
      setDeletingGroupId(null);
    }
  }

  function openEditGroupDialog(group: SplitTransactionGroup) {
    setEditingGroup(group);
    setIsEditGroupDialogOpen(true);
  }

  function handleEditGroupDialogOpenChange(open: boolean) {
    setIsEditGroupDialogOpen(open);
    if (!open) {
      setEditingGroup(null);
    }
  }

  function handleBudgetUpdated(budget: number | null) {
    setSummary((current) => (current ? { ...current, currentMonthBudget: budget } : current));
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-elevated h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-elevated h-10 w-72 animate-pulse rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-elevated h-48 animate-pulse rounded-2xl" />
          <div className="bg-elevated h-48 animate-pulse rounded-2xl" />
        </div>
        <div className="bg-elevated h-64 animate-pulse rounded-2xl" />
        <div className="bg-elevated h-72 animate-pulse rounded-2xl" />
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted mt-1 text-sm">{t('dashboard.subtitle')}</p>
        </div>
        <DashboardCtas onAddManual={openCreateForm} scanQuota={scanQuota} plan={userPlan} />
      </div>

      <section className="grid items-stretch gap-4 sm:grid-cols-2">
        <article className="panel relative z-10 h-full p-6">
          <p className="text-muted relative z-10 text-sm font-medium">
            {t('dashboard.summary.totalSpent')}
          </p>
          <p className="font-display relative z-10 mt-2 text-3xl font-bold text-[var(--text)]">
            {formatMoney(visibleTotalSpent, summary.primaryCurrency, locale)}
          </p>
          {dailyStats && (
            <BudgetProgress
              totalSpent={summary.billingPeriodTotalSpent}
              dailyStats={dailyStats}
              currentMonthBudget={summary.currentMonthBudget}
              primaryCurrency={summary.primaryCurrency}
              locale={locale}
              onBudgetUpdated={handleBudgetUpdated}
            />
          )}
        </article>
        <TransactionsInsightsCard
          transactionStats={displayedTransactionStats}
          noSpendDays={summary.noSpendDays ?? null}
        />
      </section>

      <CategoryDonutChart
        categoryTotals={categoryTotals}
        filterSelection={filterSelection}
        appliedFilter={appliedFilter}
        hiddenCategories={hiddenCategories}
        onFilterSelectionChange={setFilterSelection}
        onAppliedFilterChange={setAppliedFilter}
        onToggleCategory={toggleCategory}
        primaryCurrency={summary.primaryCurrency}
        locale={locale}
        categoryDisplayContext={categoryDisplayContext}
        customDateRange={customDateRange}
        onCustomRangeChange={handleCustomRangeApply}
      />

      <RecentTransactionsList
        transactions={filteredRecentTransactions}
        primaryCurrency={summary.primaryCurrency}
        locale={locale}
        categoryDisplayContext={categoryDisplayContext}
        isRefreshing={isRefreshing}
        groupReceiptSplits
        onEdit={openEditForm}
        onDelete={openDeleteDialog}
        onEditGroup={openEditGroupDialog}
        onDeleteGroup={openDeleteGroupDialog}
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

      <DeleteTransactionGroupDialog
        receiptGroupId={deletingGroupId}
        open={isDeleteGroupDialogOpen}
        onOpenChange={handleDeleteGroupDialogOpenChange}
        onSuccess={() => void loadDashboard({ silent: true, dateRange: customDateRange })}
      />

      <EditTransactionGroupDialog
        receiptGroupId={editingGroup?.receiptGroupId ?? null}
        initialDescription={editingGroup?.description ?? ''}
        initialDate={editingGroup?.date ?? new Date().toISOString()}
        open={isEditGroupDialogOpen}
        onOpenChange={handleEditGroupDialogOpenChange}
        onSuccess={() => void loadDashboard({ silent: true, dateRange: customDateRange })}
      />
    </div>
  );
}
