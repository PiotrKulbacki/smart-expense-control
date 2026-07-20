'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { toCalendarDateInputValue } from '@shared/features/transactions/schemas';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { useAppUser } from '@web/features/auth/components/AppUserProvider';
import { useCategories } from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { DashboardLoadingSkeleton } from '@web/features/layout/components/RouteLoadingSkeletons';
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
} from '@web/features/transactions/lib/chart-date-filter';
import { computeDailyBudgetStats } from '@web/features/dashboard/lib/dashboard-daily-stats';
import { countLogicalTransactions } from '@web/features/dashboard/lib/transaction-counts';
import { CategoryLimitsProgressCard } from '@web/features/dashboard/components/CategoryLimitsProgressCard';
import { TransactionsInsightsCard } from '@web/features/dashboard/components/TransactionsInsightsCard';
import type { DashboardData } from '@web/features/dashboard/services/dashboard.service';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import {
  fetchDashboard,
  fetchScanQuota,
  type ScanQuotaPayload,
} from '@web/features/query/fetchers';
import { queryKeys } from '@web/features/query/query-keys';

type DashboardViewProps = {
  initialDashboardData?: DashboardData;
  initialScanQuota?: ScanQuotaPayload;
};

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

function buildDashboardDateRange(customDateRange?: DateRange) {
  if (!customDateRange?.from || !customDateRange?.to) {
    return undefined;
  }

  return {
    from: startOfDay(customDateRange.from),
    to: endOfDay(customDateRange.to),
  };
}

export function DashboardView({ initialDashboardData, initialScanQuota }: DashboardViewProps = {}) {
  const t = useT();
  const { locale } = useLocale();
  const user = useAppUser();
  const queryClient = useQueryClient();
  const { colorMap, nameMap, isLoading: categoriesLoading } = useCategories();
  const categoryDisplayContext = useMemo(() => ({ colorMap, nameMap }), [colorMap, nameMap]);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const dashboardDateRange = useMemo(
    () => buildDashboardDateRange(customDateRange),
    [customDateRange]
  );
  const [filterSelection, setFilterSelection] = useState<ChartDateRange>('period');
  const [appliedFilter, setAppliedFilter] = useState<ChartDateRange>('period');
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecentTransaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SplitTransactionGroup | null>(null);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(user.id, dashboardDateRange),
    queryFn: () => fetchDashboard(dashboardDateRange),
    initialData: !dashboardDateRange ? initialDashboardData : undefined,
  });

  const scanQuotaQuery = useQuery({
    queryKey: queryKeys.scanQuota(user.id),
    queryFn: fetchScanQuota,
    initialData: initialScanQuota,
  });

  const summary = dashboardQuery.data?.summary ?? null;
  const recentTransactions = dashboardQuery.data?.recentTransactions;
  const chartTransactions = dashboardQuery.data?.chartTransactions;
  const scanQuota = scanQuotaQuery.data?.quota ?? null;
  const userPlan = scanQuotaQuery.data?.plan ?? 'FREE';
  const isLoading =
    categoriesLoading || (dashboardQuery.isLoading && dashboardQuery.data === undefined);
  const isRefreshing = dashboardQuery.isFetching && !isLoading;

  useEffect(() => {
    if (dashboardQuery.isError) {
      toast.error(
        translateError(
          dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : 'auth.errors.generic',
          locale
        )
      );
    }
  }, [dashboardQuery.isError, dashboardQuery.error, locale]);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.scanQuota(user.id) }),
    ]);
  }, [queryClient, user.id]);

  const categoryTotals = useMemo(() => {
    if (!summary) {
      return [];
    }

    return aggregateCategoryTotals(chartTransactions ?? [], appliedFilter, summary.periodStart);
  }, [chartTransactions, appliedFilter, summary]);

  const filteredRecentTransactions = useMemo(() => {
    const transactions = recentTransactions ?? [];

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
  }, [recentTransactions, appliedFilter, summary]);

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

  function handleCustomRangeApply(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      setCustomDateRange(range);
      return;
    }

    if (!range && customDateRange) {
      setCustomDateRange(undefined);
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
    queryClient.setQueryData<DashboardData>(
      queryKeys.dashboard(user.id, dashboardDateRange),
      (current) =>
        current
          ? {
              ...current,
              summary: {
                ...current.summary,
                currentMonthBudget: budget,
              },
            }
          : current
    );
  }

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
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
        <DashboardCtas
          onAddManual={openCreateForm}
          scanQuota={scanQuota}
          plan={userPlan}
          isRefreshing={isRefreshing}
        />
      </div>

      {isRefreshing && (
        <div
          className="text-muted flex items-center gap-2 text-xs"
          role="status"
          aria-live="polite"
        >
          <LoadingSpinner className="h-3.5 w-3.5" />
          <span>{t('dashboard.refreshing')}</span>
        </div>
      )}

      <section className="grid items-stretch gap-4 sm:grid-cols-2">
        <article className="panel relative z-10 h-full p-6">
          <p className="text-muted relative z-10 text-sm font-medium">
            {t('dashboard.summary.totalSpent')}
          </p>
          {isRefreshing ? (
            <div
              className="bg-elevated relative z-10 mt-2 h-9 w-40 max-w-full animate-pulse rounded-lg"
              aria-hidden
            />
          ) : (
            <p className="font-display relative z-10 mt-2 text-3xl font-bold text-[var(--text)]">
              {formatMoney(visibleTotalSpent, summary.primaryCurrency, locale)}
            </p>
          )}
          {dailyStats && (
            <BudgetProgress
              totalSpent={summary.billingPeriodTotalSpent}
              dailyStats={dailyStats}
              currentMonthBudget={summary.currentMonthBudget}
              primaryCurrency={summary.primaryCurrency}
              locale={locale}
              onBudgetUpdated={handleBudgetUpdated}
              isRefreshing={isRefreshing}
            />
          )}
        </article>
        <TransactionsInsightsCard
          transactionStats={displayedTransactionStats}
          noSpendDays={summary.noSpendDays ?? null}
          isDataRefreshing={isRefreshing}
        />
      </section>

      <CategoryLimitsProgressCard
        limits={summary.categoryLimits ?? []}
        primaryCurrency={summary.primaryCurrency}
        locale={locale}
        categoryDisplayContext={categoryDisplayContext}
        isRefreshing={isRefreshing}
      />

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
        isRefreshing={isRefreshing}
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
        onSuccess={() => void refreshDashboard()}
      />

      <DeleteTransactionDialog
        transactionId={deletingTransactionId}
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onSuccess={() => void refreshDashboard()}
      />

      <DeleteTransactionGroupDialog
        receiptGroupId={deletingGroupId}
        open={isDeleteGroupDialogOpen}
        onOpenChange={handleDeleteGroupDialogOpenChange}
        onSuccess={() => void refreshDashboard()}
      />

      <EditTransactionGroupDialog
        receiptGroupId={editingGroup?.receiptGroupId ?? null}
        initialDescription={editingGroup?.description ?? ''}
        initialDate={editingGroup?.date ?? new Date().toISOString()}
        open={isEditGroupDialogOpen}
        onOpenChange={handleEditGroupDialogOpenChange}
        onSuccess={() => void refreshDashboard()}
      />
    </div>
  );
}
