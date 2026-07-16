'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Receipt } from 'lucide-react';
import { Button } from '@web/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/components/ui/dropdown-menu';
import { cn } from '@web/lib/utils';
import { useT } from '@web/features/i18n/LocaleProvider';
import {
  groupTransactionsForDisplay,
  type SplitTransactionGroup,
} from '@web/features/transactions/lib/transaction-groups';
import {
  getCategoryIcon,
  getCategoryIconStyles,
  resolveCategoryLabel,
  type CategoryDisplayContext,
} from '@web/features/transactions/lib/category-config';

export type RecentTransaction = {
  id: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: string;
  description: string | null;
  date: string;
  isAiScanned?: boolean;
  receiptGroupId?: string | null;
};

type RecentTransactionsListProps = {
  transactions: RecentTransaction[];
  primaryCurrency: string;
  locale: string;
  categoryDisplayContext?: CategoryDisplayContext;
  isRefreshing?: boolean;
  groupReceiptSplits?: boolean;
  initialExpandedGroupIds?: string[];
  onEdit: (transaction: RecentTransaction) => void;
  onDelete: (transactionId: string) => void;
  onEditGroup?: (group: SplitTransactionGroup) => void;
  onDeleteGroup?: (receiptGroupId: string) => void;
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

function SingleTransactionRow({
  transaction,
  primaryCurrency,
  locale,
  categoryDisplayContext,
  onEdit,
  onDelete,
}: {
  transaction: RecentTransaction;
  primaryCurrency: string;
  locale: string;
  categoryDisplayContext?: CategoryDisplayContext;
  onEdit: (transaction: RecentTransaction) => void;
  onDelete: (transactionId: string) => void;
  nested?: boolean;
}) {
  const t = useT();
  const Icon = getCategoryIcon(transaction.category);
  const iconStyles = getCategoryIconStyles(transaction.category);
  const showOriginal = transaction.currency !== primaryCurrency;

  return (
    <article className="flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles.bg} ${iconStyles.text}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text)]">
            {resolveCategoryLabel(transaction.category, t, categoryDisplayContext)}
          </p>
          {transaction.description && (
            <p className="text-muted mt-0.5 truncate text-sm">{transaction.description}</p>
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
}

function SplitGroupRow({
  group,
  primaryCurrency,
  locale,
  categoryDisplayContext,
  onEdit,
  onDelete,
  onEditGroup,
  onDeleteGroup,
  initialExpanded,
}: {
  group: SplitTransactionGroup;
  primaryCurrency: string;
  locale: string;
  categoryDisplayContext?: CategoryDisplayContext;
  onEdit: (transaction: RecentTransaction) => void;
  onDelete: (transactionId: string) => void;
  onEditGroup?: (group: SplitTransactionGroup) => void;
  onDeleteGroup?: (receiptGroupId: string) => void;
  initialExpanded?: boolean;
}) {
  const t = useT();
  const [isExpanded, setIsExpanded] = useState(initialExpanded ?? false);
  const showOriginal = group.currency !== primaryCurrency;
  const title = group.description ?? t('history.split.untitledReceipt');

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="text-muted mt-2 shrink-0"
            aria-label={isExpanded ? t('history.split.collapse') : t('history.split.expand')}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <span className="bg-cool/10 text-cool mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Receipt className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{title}</p>
              <span className="chip chip-ready">{t('history.split.badge')}</span>
            </div>
            <p className="text-muted mt-0.5 text-sm">
              {t('history.split.total', {
                amount: formatMoney(group.totalConvertedAmount, primaryCurrency, locale),
              })}
            </p>
            <p className="text-muted mt-1 text-xs">
              {new Date(group.date).toLocaleDateString(locale, {
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
              {formatMoney(group.totalConvertedAmount, primaryCurrency, locale)}
            </p>
            {showOriginal && (
              <p className="text-muted text-xs">
                {formatMoney(group.totalOriginalAmount, group.currency, locale)}
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
              {onEditGroup && (
                <DropdownMenuItem onClick={() => onEditGroup(group)}>
                  {t('history.split.editGroupAction')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDeleteGroup && (
                <DropdownMenuItem
                  className="text-glow focus:bg-glow/10 focus:text-glow"
                  onClick={() => onDeleteGroup(group.receiptGroupId)}
                >
                  {t('history.split.deleteGroupAction')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-[var(--border)]/60 ml-14 mt-3 space-y-1 border-l pl-4">
            {group.transactions.map((transaction) => {
              const Icon = getCategoryIcon(transaction.category);
              const iconStyles = getCategoryIconStyles(transaction.category);

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-lg py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconStyles.bg} ${iconStyles.text}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="truncate text-sm text-[var(--text)]">
                      {resolveCategoryLabel(transaction.category, t, categoryDisplayContext)}:{' '}
                      {formatMoney(transaction.convertedAmount, primaryCurrency, locale)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted h-7 w-7"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
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
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

export function RecentTransactionsList({
  transactions,
  primaryCurrency,
  locale,
  categoryDisplayContext,
  isRefreshing = false,
  groupReceiptSplits = false,
  initialExpandedGroupIds,
  onEdit,
  onDelete,
  onEditGroup,
  onDeleteGroup,
  onAddFirst,
  titleKey = 'dashboard.recent.title',
  emptyTitleKey = 'dashboard.recent.emptyTitle',
  emptyDescriptionKey = 'dashboard.recent.empty',
  hideEmptyCta = false,
}: RecentTransactionsListProps) {
  const t = useT();
  const displayEntries = useMemo(
    () => (groupReceiptSplits ? groupTransactionsForDisplay(transactions) : null),
    [groupReceiptSplits, transactions]
  );

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
        <div className="recent-transactions-scroll relative z-10 mt-4 max-h-[350px] overflow-y-auto pr-2">
          <div className="divide-y divide-[var(--border)]">
            {displayEntries
              ? displayEntries.map((entry) =>
                  entry.kind === 'split' ? (
                    <SplitGroupRow
                      key={entry.receiptGroupId}
                      group={entry}
                      primaryCurrency={primaryCurrency}
                      locale={locale}
                      categoryDisplayContext={categoryDisplayContext}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onEditGroup={onEditGroup}
                      onDeleteGroup={onDeleteGroup}
                      initialExpanded={initialExpandedGroupIds?.includes(entry.receiptGroupId)}
                    />
                  ) : (
                    <SingleTransactionRow
                      key={entry.transaction.id}
                      transaction={entry.transaction}
                      primaryCurrency={primaryCurrency}
                      locale={locale}
                      categoryDisplayContext={categoryDisplayContext}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  )
                )
              : transactions.map((transaction) => (
                  <SingleTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    primaryCurrency={primaryCurrency}
                    locale={locale}
                    categoryDisplayContext={categoryDisplayContext}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
          </div>
        </div>
      )}
    </section>
  );
}
