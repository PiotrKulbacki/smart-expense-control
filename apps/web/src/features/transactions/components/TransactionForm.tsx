'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { translateError } from '@shared/features/i18n';
import {
  transactionFormSchema,
  TRANSACTION_CATEGORIES,
  type CurrencyCode,
  type TransactionFormInput,
} from '@shared/features/transactions/schemas';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { Textarea } from '@web/components/ui/textarea';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { getCategoryLabelKey } from '@web/features/transactions/lib/category-config';

export type TransactionFormInitialValues = TransactionFormInput;

type TransactionFormProps = {
  primaryCurrency: CurrencyCode;
  transactionId?: string;
  initialValues?: TransactionFormInitialValues;
  onSuccess: () => void;
  onCancel: () => void;
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionForm({
  primaryCurrency,
  transactionId,
  initialValues,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const t = useT();
  const { locale } = useLocale();
  const isEditing = Boolean(transactionId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: initialValues?.amount ?? (undefined as unknown as number),
      currency: initialValues?.currency ?? primaryCurrency,
      category: initialValues?.category ?? 'Other',
      description: initialValues?.description ?? '',
      date: initialValues?.date ?? toDateInputValue(new Date()),
    },
  });

  useEffect(() => {
    reset({
      amount: initialValues?.amount ?? (undefined as unknown as number),
      currency: initialValues?.currency ?? primaryCurrency,
      category: initialValues?.category ?? 'Other',
      description: initialValues?.description ?? '',
      date: initialValues?.date ?? toDateInputValue(new Date()),
    });
  }, [initialValues, primaryCurrency, reset, transactionId]);

  async function onSubmit(values: TransactionFormInput) {
    try {
      const payload = {
        ...values,
        description: values.description?.trim() || undefined,
        date: values.date,
        ...(isEditing ? {} : { isAiScanned: false }),
      };

      const response = await fetch(
        isEditing ? `/api/transactions/${transactionId}` : '/api/transactions',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t(isEditing ? 'transactions.success.updated' : 'transactions.success.created'));
      onSuccess();
    } catch {
      toast.error(t('auth.errors.networkError'));
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount">{t('dashboard.form.amount')}</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            disabled={isSubmitting}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount?.message && (
            <p className="mt-1 text-xs text-red-600">
              {translateError(errors.amount.message, locale)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="currency">{t('dashboard.form.currency')}</Label>
          <select
            id="currency"
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('currency')}
          >
            {(['PLN', 'EUR', 'GBP'] as const).map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          {errors.currency?.message && (
            <p className="mt-1 text-xs text-red-600">
              {translateError(errors.currency.message, locale)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="category">{t('dashboard.form.category')}</Label>
          <select
            id="category"
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('category')}
          >
            {TRANSACTION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(getCategoryLabelKey(category))}
              </option>
            ))}
          </select>
          {errors.category?.message && (
            <p className="mt-1 text-xs text-red-600">
              {translateError(errors.category.message, locale)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="date">{t('dashboard.form.date')}</Label>
          <Input id="date" type="date" disabled={isSubmitting} {...register('date')} />
          {errors.date?.message && (
            <p className="mt-1 text-xs text-red-600">
              {translateError(errors.date.message, locale)}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">{t('dashboard.form.descriptionOptional')}</Label>
        <Textarea
          id="description"
          rows={3}
          disabled={isSubmitting}
          placeholder={t('dashboard.form.descriptionPlaceholder')}
          {...register('description')}
        />
        {errors.description?.message && (
          <p className="mt-1 text-xs text-red-600">
            {translateError(errors.description.message, locale)}
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {t(
            isEditing
              ? 'transactions.labels.saveTransaction'
              : 'transactions.labels.saveTransaction'
          )}
        </Button>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
          {t('dashboard.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
