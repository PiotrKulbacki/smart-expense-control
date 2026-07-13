'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatBillingPeriodLabel,
  getPreviousQuotaPeriodStart,
  getQuotaPeriodEnd,
  getQuotaPeriodStart,
} from '@shared/features/billing/financial-month';
import { translateError } from '@shared/features/i18n';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { Button } from '@web/components/ui/button';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { DeleteTransactionDialog } from '@web/features/transactions/components/DeleteTransactionDialog';
import {
  RecentTransactionsList,
  type RecentTransaction,
} from '@web/features/transactions/components/RecentTransactionsList';
import { TransactionFormModal } from '@web/features/transactions/components/TransactionFormModal';
import type { TransactionFormInitialValues } from '@web/features/transactions/components/TransactionForm';

type HistoryUserMeta = {
  primaryCurrency: CurrencyCode;
  financialMonthStartDay: number;
};

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

export function HistoryView() {
  const t = useT();
  const { locale } = useLocale();
  const [userMeta, setUserMeta] = useState<HistoryUserMeta | null>(null);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecentTransaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadTransactions = useCallback(
    async (options: { start: Date; end: Date; silent?: boolean }) => {
      if (!options.silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('from', options.start.toISOString());
        params.set('to', options.end.toISOString());

        const response = await fetch(`/api/transactions?${params.toString()}`);
        const data = (await response.json()) as {
          transactions?: RecentTransaction[];
          error?: string;
        };

        if (!response.ok) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        setTransactions(data.transactions ?? []);
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
    async function init() {
      try {
        const response = await fetch('/api/auth/me');
        const data = (await response.json()) as {
          user?: {
            primaryCurrency: CurrencyCode;
            financialMonthStartDay: number;
          };
          error?: string;
        };

        if (!response.ok || !data.user) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        const meta = {
          primaryCurrency: data.user.primaryCurrency,
          financialMonthStartDay: data.user.financialMonthStartDay,
        };
        setUserMeta(meta);

        const previousStart = getPreviousQuotaPeriodStart(meta.financialMonthStartDay);
        const previousEnd = getQuotaPeriodEnd(previousStart);
        setPeriodStart(previousStart);
        await loadTransactions({ start: previousStart, end: previousEnd });
      } catch {
        toast.error(t('auth.errors.networkError'));
      }
    }

    void init();
  }, [locale, loadTransactions, t]);

  function shiftPeriod(direction: -1 | 1) {
    if (!userMeta || !periodStart) {
      return;
    }

    const nextStart = new Date(periodStart);
    nextStart.setUTCMonth(nextStart.getUTCMonth() + direction);
    const nextEnd = getQuotaPeriodEnd(nextStart);

    const currentStart = getQuotaPeriodStart(userMeta.financialMonthStartDay, new Date());
    if (direction === 1 && nextStart >= currentStart) {
      return;
    }

    setPeriodStart(nextStart);
    void loadTransactions({ start: nextStart, end: nextEnd, silent: true });
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

  function reloadCurrentPeriod() {
    if (!periodStart) {
      return;
    }

    const end = getQuotaPeriodEnd(periodStart);
    void loadTransactions({ start: periodStart, end, silent: true });
  }

  if (isLoading || !userMeta || !periodStart) {
    return (
      <div className="space-y-4">
        <div className="bg-elevated h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-elevated h-72 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const periodEnd = getQuotaPeriodEnd(periodStart);
  const periodLabel = formatBillingPeriodLabel(periodStart, periodEnd, locale);
  const currentPeriodStart = getQuotaPeriodStart(userMeta.financialMonthStartDay, new Date());
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
        primaryCurrency={userMeta.primaryCurrency}
        locale={locale}
        isRefreshing={isRefreshing}
        onEdit={openEditForm}
        onDelete={openDeleteDialog}
        onAddFirst={() => undefined}
        emptyTitleKey="history.emptyTitle"
        emptyDescriptionKey="history.empty"
        titleKey="history.transactionsTitle"
        hideEmptyCta
      />

      <TransactionFormModal
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        primaryCurrency={userMeta.primaryCurrency}
        transactionId={editingTransaction?.id}
        initialValues={editingTransaction ? toFormInitialValues(editingTransaction) : undefined}
        onSuccess={reloadCurrentPeriod}
      />

      <DeleteTransactionDialog
        transactionId={deletingTransactionId}
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onSuccess={reloadCurrentPeriod}
      />
    </div>
  );
}
