'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import {
  getCategoryOptionLabel,
  useCategories,
} from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

const CREATE_CATEGORY_VALUE = '__create_category__';

type CategorySelectWithCreateProps = {
  value: string;
  disabled?: boolean;
  onChange: (categoryKey: string) => void;
};

export function CategorySelectWithCreate({
  value,
  disabled = false,
  onChange,
}: CategorySelectWithCreateProps) {
  const t = useT();
  const { locale } = useLocale();
  const { categories, reload } = useCategories();
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateCategory() {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = (await response.json()) as {
        category?: CategoryListItem;
        error?: string;
      };

      if (!response.ok || !data.category) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      await reload();
      onChange(data.category.key);
      setIsCreating(false);
      setNewCategoryName('');
      toast.success(t('settings.categories.success.created'));
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCreating) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newCategoryName}
          disabled={disabled || isSubmitting}
          onChange={(event) => setNewCategoryName(event.target.value)}
          placeholder={t('scanner.split.createCategoryPlaceholder')}
          className="auth-input min-w-[12rem] flex-1"
        />
        <button
          type="button"
          disabled={disabled || isSubmitting || !newCategoryName.trim()}
          onClick={() => void handleCreateCategory()}
          className="btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('scanner.split.createCategorySubmit')}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            setIsCreating(false);
            setNewCategoryName('');
          }}
          className="btn-ghost px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('dashboard.form.cancel')}
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => {
        if (event.target.value === CREATE_CATEGORY_VALUE) {
          setIsCreating(true);
          return;
        }

        onChange(event.target.value);
      }}
      className="auth-input"
    >
      {categories.map((category) => (
        <option key={category.key} value={category.key}>
          {getCategoryOptionLabel(category, t)}
        </option>
      ))}
      <option value={CREATE_CATEGORY_VALUE}>{t('scanner.split.createCategory')}</option>
    </select>
  );
}
