'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  formatBillingPeriodLabel,
  getQuotaPeriodEnd,
  getQuotaPeriodStart,
} from '@shared/features/billing/financial-month';
import { toCalendarDateInputValue, type CurrencyCode } from '@shared/features/transactions/schemas';
import { Button } from '@web/components/ui/button';
import { useAppUser } from '@web/features/auth/components/AppUserProvider';
import { useCategories } from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { HistoryLoadingSkeleton } from '@web/features/layout/components/RouteLoadingSkeletons';
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
import { fetchHistoryTransactions } from '@web/features/query/fetchers';
import { queryKeys } from '@web/features/query/query-keys';

type HistoryViewProps = {
  initialPeriodStart: string;
  initialTransactions: RecentTransaction[];
  highlightReceiptGroupId?: string | null;
};

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

export function HistoryView({
  initialPeriodStart,
  initialTransactions,
  highlightReceiptGroupId: initialHighlightReceiptGroupId = null,
}: HistoryViewProps) {
  const t = useT();
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const highlightReceiptGroupId =
    searchParams.get('receiptGroupId') ?? initialHighlightReceiptGroupId;
  const user = useAppUser();
  const queryClient = useQueryClient();
  const { colorMap, nameMap, isLoading: categoriesLoading } = useCategories();
  const categoryDisplayContext = useMemo(() => ({ colorMap, nameMap }), [colorMap, nameMap]);
  const [periodStart, setPeriodStart] = useState<Date>(() => new Date(initialPeriodStart));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecentTransaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SplitTransactionGroup | null>(null);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);

  const periodEnd = getQuotaPeriodEnd(periodStart);
  const historyQueryKey = queryKeys.historyTransactions(user.id, {
    from: periodStart.toISOString(),
    to: periodEnd.toISOString(),
    receiptGroupId: highlightReceiptGroupId,
  });

  const transactionsQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: () =>
      fetchHistoryTransactions({
        from: periodStart.toISOString(),
        to: periodEnd.toISOString(),
        receiptGroupId: highlightReceiptGroupId,
      }),
    initialData: periodStart.toISOString() === initialPeriodStart ? initialTransactions : undefined,
  });

  const transactions = transactionsQuery.data ?? [];
  const isLoading =
    categoriesLoading || (transactionsQuery.isLoading && transactionsQuery.data === undefined);
  const isRefreshing = transactionsQuery.isFetching && !isLoading;

  const reloadCurrentPeriod = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: historyQueryKey });
  }, [historyQueryKey, queryClient]);

  function shiftPeriod(direction: -1 | 1) {
    const nextStart = new Date(periodStart);
    nextStart.setUTCMonth(nextStart.getUTCMonth() + direction);

    const currentStart = getQuotaPeriodStart(user.financialMonthStartDay, new Date());
    if (direction === 1 && nextStart >= currentStart) {
      return;
    }

    setPeriodStart(nextStart);
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

  function reloadCurrentPeriodSync() {
    void reloadCurrentPeriod();
  }

  if (isLoading) {
    return <HistoryLoadingSkeleton />;
  }

  const periodLabel = formatBillingPeriodLabel(periodStart, periodEnd, locale);
  const currentPeriodStart = getQuotaPeriodStart(user.financialMonthStartDay, new Date());
  const canGoNext = periodStart < currentPeriodStart;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
          {t('history.title')}
        </h1>
        <p className="text-muted mt-1 text-sm">{t('history.subtitle')}</p>
      </div>

      <div className="panel relative z-10 flex items-center justify-between gap-3 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => shiftPeriod(-1)}
          aria-label={t('history.previousMonth')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="relative z-10 text-center text-sm font-semibold text-[var(--text)] sm:text-base">
          {periodLabel}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canGoNext}
          onClick={() => shiftPeriod(1)}
          aria-label={t('history.nextMonth')}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <RecentTransactionsList
        transactions={transactions}
        primaryCurrency={user.primaryCurrency}
        locale={locale}
        categoryDisplayContext={categoryDisplayContext}
        isRefreshing={isRefreshing}
        groupReceiptSplits
        initialExpandedGroupIds={highlightReceiptGroupId ? [highlightReceiptGroupId] : undefined}
        onEdit={openEditForm}
        onDelete={openDeleteDialog}
        onEditGroup={openEditGroupDialog}
        onDeleteGroup={openDeleteGroupDialog}
        onAddFirst={() => undefined}
        emptyTitleKey="history.emptyTitle"
        emptyDescriptionKey="history.empty"
        titleKey="history.transactionsTitle"
        hideEmptyCta
      />

      <TransactionFormModal
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        primaryCurrency={user.primaryCurrency}
        transactionId={editingTransaction?.id}
        initialValues={editingTransaction ? toFormInitialValues(editingTransaction) : undefined}
        onSuccess={reloadCurrentPeriodSync}
      />

      <DeleteTransactionDialog
        transactionId={deletingTransactionId}
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onSuccess={reloadCurrentPeriodSync}
      />

      <DeleteTransactionGroupDialog
        receiptGroupId={deletingGroupId}
        open={isDeleteGroupDialogOpen}
        onOpenChange={handleDeleteGroupDialogOpenChange}
        onSuccess={reloadCurrentPeriodSync}
      />

      <EditTransactionGroupDialog
        receiptGroupId={editingGroup?.receiptGroupId ?? null}
        initialDescription={editingGroup?.description ?? ''}
        initialDate={editingGroup?.date ?? new Date().toISOString()}
        open={isEditGroupDialogOpen}
        onOpenChange={handleEditGroupDialogOpenChange}
        onSuccess={reloadCurrentPeriodSync}
      />
    </div>
  );
}
