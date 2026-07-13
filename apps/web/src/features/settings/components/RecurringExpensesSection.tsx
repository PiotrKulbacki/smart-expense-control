'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { convertAmount } from '@shared/features/currency';
import type { ExchangeRateMap } from '@shared/features/currency/types';
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

type RecurringExpenseItem = {
  id: string;
  amount: number;
  currency: string;
  category: string;
};

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
  const [expenses, setExpenses] = useState<RecurringExpenseItem[]>([]);
  const [rateMap, setRateMap] = useState<ExchangeRateMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(primaryCurrency);

  const loadExpenses = useCallback(async () => {
    try {
      const [expensesResponse, ratesResponse] = await Promise.all([
        fetch('/api/recurring-expenses'),
        fetch('/api/currency/rates'),
      ]);

      const data = (await expensesResponse.json()) as {
        recurringExpenses?: RecurringExpenseItem[];
        error?: string;
      };

      if (!expensesResponse.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      setExpenses(data.recurringExpenses ?? []);

      if (ratesResponse.ok) {
        const ratesData = (await ratesResponse.json()) as { rates?: ExchangeRateMap };
        setRateMap(ratesData.rates ?? {});
      }
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    setCurrency(primaryCurrency);
  }, [primaryCurrency]);

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
      await loadExpenses();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(expenseId: string) {
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
      await loadExpenses();
    } catch {
      toast.error(t('auth.errors.networkError'));
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('settings.recurring.title')}</h2>
          <p className="mt-1 text-sm text-gray-600">{t('settings.recurring.description')}</p>
        </div>
        {!isLoading && expenses.length > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-right">
            <p className="text-xs font-medium text-indigo-600">
              {t('settings.recurring.monthlyTotal')}
            </p>
            <p className="mt-0.5 text-lg font-bold text-indigo-900">
              {formatMoney(monthlyTotal, primaryCurrency, locale)}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={(event) => void handleAdd(event)} className="mt-4 grid gap-3 sm:grid-cols-4">
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          {(['PLN', 'EUR', 'GBP'] as const).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={isSaving} className="sm:col-span-4 sm:w-auto">
          <Plus className="h-4 w-4" />
          {t('settings.recurring.add')}
        </Button>
      </form>

      {isLoading ? (
        <div className="mt-6 h-24 animate-pulse rounded-xl bg-gray-100" />
      ) : expenses.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{t('settings.recurring.empty')}</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{expense.category}</p>
                <p className="text-xs text-gray-500">
                  {formatMoney(expense.amount, expense.currency, locale)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500"
                    aria-label={t('settings.recurring.actions')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 focus:text-red-600"
                    onClick={() => void handleDelete(expense.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
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
