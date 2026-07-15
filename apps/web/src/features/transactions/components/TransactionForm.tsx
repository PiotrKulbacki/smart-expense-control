'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { translateError } from '@shared/features/i18n';
import { SUPPORTED_CURRENCIES } from '@shared/features/currency';
import {
  transactionFormSchema,
  toLocalDateInputValue,
  type CurrencyCode,
  type TransactionFormInput,
} from '@shared/features/transactions/schemas';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { Textarea } from '@web/components/ui/textarea';
import {
  getCategoryOptionLabel,
  useCategories,
} from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

export type TransactionFormInitialValues = TransactionFormInput;

type TransactionFormProps = {
  primaryCurrency: CurrencyCode;
  transactionId?: string;
  initialValues?: TransactionFormInitialValues;
  onSuccess: () => void;
  onCancel: () => void;
};

export function TransactionForm({
  primaryCurrency,
  transactionId,
  initialValues,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const t = useT();
  const { locale } = useLocale();
  const { categories, isLoading: isCategoriesLoading } = useCategories();
  const isEditing = Boolean(transactionId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: initialValues?.amount ?? (undefined as unknown as number),
      currency: initialValues?.currency ?? primaryCurrency,
      category: initialValues?.category ?? 'Other',
      description: initialValues?.description ?? '',
      date: initialValues?.date ?? toLocalDateInputValue(),
    },
  });

  useEffect(() => {
    reset({
      amount: initialValues?.amount ?? (undefined as unknown as number),
      currency: initialValues?.currency ?? primaryCurrency,
      category: initialValues?.category ?? categories[0]?.key ?? 'Other',
      description: initialValues?.description ?? '',
      date: initialValues?.date ?? toLocalDateInputValue(),
    });
  }, [initialValues, primaryCurrency, reset, transactionId, categories]);

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
    <form
      onSubmit={(event) =>
        void handleSubmit(onSubmit, (invalidErrors) => {
          const firstError = Object.values(invalidErrors)[0];
          if (firstError?.message) {
            toast.error(translateError(firstError.message, locale));
          }
        })(event)
      }
      className="space-y-4"
    >
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
        </div>

        <div>
          <Label htmlFor="currency">{t('dashboard.form.currency')}</Label>
          <select
            id="currency"
            disabled={isSubmitting}
            className="auth-input flex h-10 w-full"
            {...register('currency')}
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="category">{t('dashboard.form.category')}</Label>
          <select
            id="category"
            disabled={isSubmitting || isCategoriesLoading}
            className="auth-input flex h-10 w-full"
            {...register('category')}
          >
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {getCategoryOptionLabel(category, t)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="date">{t('dashboard.form.date')}</Label>
          <Input id="date" type="date" disabled={isSubmitting} {...register('date')} />
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
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {t('transactions.labels.saveTransaction')}
        </Button>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
          {t('dashboard.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
