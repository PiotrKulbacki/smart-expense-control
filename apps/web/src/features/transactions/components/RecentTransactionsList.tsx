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
        <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
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
}: RecentTransactionsListProps) {
  const t = useT();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recent.title')}</h2>

      {isRefreshing ? (
        <div className="mt-4 divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, index) => (
            <TransactionRowSkeleton key={index} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <Receipt className="h-7 w-7" />
          </span>
          <p className="mt-4 max-w-xs text-sm font-medium text-gray-900">
            {t('dashboard.recent.emptyTitle')}
          </p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">{t('dashboard.recent.empty')}</p>
          <Button type="button" className="mt-5" onClick={onAddFirst}>
            {t('dashboard.recent.emptyCta')}
          </Button>
        </div>
      ) : (
        <ScrollArea className="mt-4 max-h-[28rem]">
          <div className="divide-y divide-gray-100 pr-3">
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
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {t(getCategoryLabelKey(transaction.category))}
                      </p>
                      {transaction.description && (
                        <p className="mt-0.5 truncate text-sm text-gray-600">
                          {transaction.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
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
                      <p className="text-sm font-bold text-gray-900">
                        {formatMoney(transaction.convertedAmount, primaryCurrency, locale)}
                      </p>
                      {showOriginal && (
                        <p className="text-xs text-gray-400">
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
                          className="h-8 w-8 text-gray-500"
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
                          className="text-red-600 focus:bg-red-50 focus:text-red-600"
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
