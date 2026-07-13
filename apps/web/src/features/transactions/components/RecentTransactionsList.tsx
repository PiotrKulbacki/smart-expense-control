'use client';

import { MoreHorizontal, Receipt } from 'lucide-react';
import { Button } from '@web/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/components/ui/dropdown-menu';
import { ScrollArea } from '@web/components/ui/scroll-area';
import { useT } from '@web/features/i18n/LocaleProvider';
import {
  getCategoryIcon,
  getCategoryIconStyles,
  getCategoryLabelKey,
} from '@web/features/transactions/lib/category-config';

export type RecentTransaction = {
  id: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: string;
  description: string | null;
  date: string;
};

type RecentTransactionsListProps = {
  transactions: RecentTransaction[];
  primaryCurrency: string;
  locale: string;
  isRefreshing?: boolean;
  onEdit: (transaction: RecentTransaction) => void;
  onDelete: (transactionId: string) => void;
  onAddFirst: () => void;
  titleKey?: string;
  emptyTitleKey?: string;
  emptyDescriptionKey?: string;
  hideEmptyCta?: boolean;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function TransactionRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div className="bg-elevated h-10 w-10 animate-pulse rounded-xl" />
        <div className="space-y-2">
          <div className="bg-elevated h-4 w-28 animate-pulse rounded" />
          <div className="bg-elevated h-3 w-20 animate-pulse rounded" />
        </div>
      </div>
      <div className="bg-elevated h-4 w-16 animate-pulse rounded" />
    </div>
  );
}

export function RecentTransactionsList({
  transactions,
  primaryCurrency,
  locale,
  isRefreshing = false,
  onEdit,
  onDelete,
  onAddFirst,
  titleKey = 'dashboard.recent.title',
  emptyTitleKey = 'dashboard.recent.emptyTitle',
  emptyDescriptionKey = 'dashboard.recent.empty',
  hideEmptyCta = false,
}: RecentTransactionsListProps) {
  const t = useT();

  return (
    <section className="panel relative z-10 p-6">
      <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
        {t(titleKey)}
      </h2>

      {isRefreshing ? (
        <div className="relative z-10 mt-4 divide-y divide-[var(--border)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <TransactionRowSkeleton key={index} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="relative z-10 mt-8 flex flex-col items-center justify-center py-6 text-center">
          <span className="bg-elevated text-muted flex h-14 w-14 items-center justify-center rounded-2xl">
            <Receipt className="h-7 w-7" />
          </span>
          <p className="mt-4 max-w-xs text-sm font-medium text-[var(--text)]">{t(emptyTitleKey)}</p>
          <p className="text-muted mt-1 max-w-xs text-sm">{t(emptyDescriptionKey)}</p>
          {!hideEmptyCta && (
            <Button type="button" className="mt-5" onClick={onAddFirst}>
              {t('dashboard.recent.emptyCta')}
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea className="relative z-10 mt-4 max-h-[28rem]">
          <div className="divide-y divide-[var(--border)] pr-3">
            {transactions.map((transaction) => {
              const Icon = getCategoryIcon(transaction.category);
              const iconStyles = getCategoryIconStyles(transaction.category);
              const showOriginal = transaction.currency !== primaryCurrency;

              return (
                <article
                  key={transaction.id}
                  className="flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles.bg} ${iconStyles.text}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">
                        {t(getCategoryLabelKey(transaction.category))}
                      </p>
                      {transaction.description && (
                        <p className="text-muted mt-0.5 truncate text-sm">
                          {transaction.description}
                        </p>
                      )}
                      <p className="text-muted mt-1 text-xs">
                        {new Date(transaction.date).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-start gap-1">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--text)]">
                        {formatMoney(transaction.convertedAmount, primaryCurrency, locale)}
                      </p>
                      {showOriginal && (
                        <p className="text-muted text-xs">
                          {formatMoney(transaction.amount, transaction.currency, locale)}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted h-8 w-8"
                          aria-label={t('dashboard.recent.actions')}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(transaction)}>
                          {t('transactions.labels.editTransaction')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-glow focus:bg-glow/10 focus:text-glow"
                          onClick={() => onDelete(transaction.id)}
                        >
                          {t('transactions.labels.deleteTransaction')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
