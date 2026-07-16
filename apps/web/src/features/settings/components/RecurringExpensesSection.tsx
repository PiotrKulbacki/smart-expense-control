'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { convertAmount } from '@shared/features/currency';
import type { ExchangeRateMap } from '@shared/features/currency/types';
import { SUPPORTED_CURRENCIES } from '@shared/features/currency';
import { translateError } from '@shared/features/i18n';
import type { CurrencyCode } from '@shared/features/transactions/schemas';
import { Button } from '@web/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@web/components/ui/dropdown-menu';
import { Input } from '@web/components/ui/input';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { useAppUser } from '@web/features/auth/components/AppUserProvider';
import {
  fetchCurrencyRates,
  fetchRecurringExpenses,
  type RecurringExpenseItem,
} from '@web/features/query/fetchers';
import { queryKeys } from '@web/features/query/query-keys';

type RecurringExpensesSectionProps = {
  primaryCurrency: CurrencyCode;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function RecurringExpensesSection({ primaryCurrency }: RecurringExpensesSectionProps) {
  const t = useT();
  const { locale } = useLocale();
  const user = useAppUser();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(primaryCurrency);

  const expensesQuery = useQuery({
    queryKey: queryKeys.recurringExpenses(user.id),
    queryFn: fetchRecurringExpenses,
  });

  const ratesQuery = useQuery({
    queryKey: queryKeys.currencyRates(user.id),
    queryFn: fetchCurrencyRates,
  });

  useEffect(() => {
    const errorSource = expensesQuery.isError ? expensesQuery.error : ratesQuery.error;
    const isError = expensesQuery.isError || ratesQuery.isError;

    if (!isError) {
      return;
    }

    toast.error(
      translateError(
        errorSource instanceof Error ? errorSource.message : 'auth.errors.generic',
        locale
      )
    );
  }, [expensesQuery.error, expensesQuery.isError, locale, ratesQuery.error, ratesQuery.isError]);

  useEffect(() => {
    setCurrency(primaryCurrency);
  }, [primaryCurrency]);

  const expenses = expensesQuery.data ?? [];
  const rateMap: ExchangeRateMap = ratesQuery.data ?? {};
  const isLoading =
    (expensesQuery.isLoading && expensesQuery.data === undefined) ||
    (ratesQuery.isLoading && ratesQuery.data === undefined);

  const monthlyTotal = useMemo(() => {
    let total = 0;

    for (const expense of expenses) {
      try {
        total += convertAmount(
          expense.amount,
          expense.currency as CurrencyCode,
          primaryCurrency,
          rateMap
        );
      } catch {
        if (expense.currency === primaryCurrency) {
          total += expense.amount;
        }
      }
    }

    return Math.round(total * 100) / 100;
  }, [expenses, primaryCurrency, rateMap]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error(t('recurring.errors.invalidCategory'));
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('recurring.errors.invalidAmount'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          currency,
          category: trimmedName,
          frequency: 'MONTHLY',
          nextDueDate: new Date().toISOString(),
          isActive: true,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('recurring.success.created'));
      setName('');
      setAmount('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.currencyRates(user.id) }),
      ]);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(expenseId: string) {
    setDeletingId(expenseId);

    try {
      const response = await fetch(`/api/recurring-expenses/${expenseId}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('recurring.success.deleted'));
      await queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses(user.id) });
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel relative z-10 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
            {t('settings.recurring.title')}
          </h2>
          <p className="text-muted relative z-10 mt-1 text-sm">
            {t('settings.recurring.description')}
          </p>
        </div>
        {!isLoading && expenses.length > 0 && (
          <div className="border-cool/30 bg-cool/10 relative z-10 rounded-xl border px-4 py-3 text-right">
            <p className="text-cool text-xs font-medium">{t('settings.recurring.monthlyTotal')}</p>
            <p className="font-display mt-0.5 text-lg font-bold text-[var(--text)]">
              {formatMoney(monthlyTotal, primaryCurrency, locale)}
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => void handleAdd(event)}
        className="relative z-10 mt-4 grid gap-3 sm:grid-cols-4"
      >
        <Input
          type="text"
          value={name}
          disabled={isSaving}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('settings.recurring.namePlaceholder')}
          className="sm:col-span-2"
        />
        <Input
          type="number"
          min={0.01}
          step="0.01"
          value={amount}
          disabled={isSaving}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={t('settings.recurring.amountPlaceholder')}
        />
        <select
          value={currency}
          disabled={isSaving}
          onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
          className="auth-input"
        >
          {SUPPORTED_CURRENCIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          loading={isSaving}
          disabled={isSaving}
          className="sm:col-span-4 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t('settings.recurring.add')}
        </Button>
      </form>

      {isLoading ? (
        <div className="bg-elevated relative z-10 mt-6 h-24 animate-pulse rounded-xl" />
      ) : expenses.length === 0 ? (
        <p className="text-muted relative z-10 mt-6 text-sm">{t('settings.recurring.empty')}</p>
      ) : (
        <ul className="relative z-10 mt-6 divide-y divide-[var(--border)]">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text)]">
                  {expense.category}
                </p>
                <p className="text-muted text-xs">
                  {formatMoney(expense.amount, expense.currency, locale)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted h-8 w-8"
                    aria-label={t('settings.recurring.actions')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-glow focus:bg-glow/10 focus:text-glow"
                    disabled={deletingId === expense.id}
                    onClick={() => void handleDelete(expense.id)}
                  >
                    {deletingId === expense.id ? (
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {t('transactions.labels.deleteTransaction')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
