'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { CategoryLimitRecord } from '@shared/features/transactions/category-limit-schemas';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@web/components/ui/sheet';
import {
  getCategoryOptionLabel,
  useSortedCategoriesForSelect,
} from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import {
  getCategoryColor,
  resolveCategoryLabel,
  type CategoryDisplayContext,
} from '@web/features/transactions/lib/category-config';

type CategoryLimitsSectionProps = {
  primaryCurrency: string;
};

export function CategoryLimitsSection({ primaryCurrency }: CategoryLimitsSectionProps) {
  const t = useT();
  const { locale } = useLocale();
  const {
    categories,
    colorMap,
    nameMap,
    isLoading: isCategoriesLoading,
  } = useSortedCategoriesForSelect();
  const [limits, setLimits] = useState<CategoryLimitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [categoryKey, setCategoryKey] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const displayContext: CategoryDisplayContext = useMemo(
    () => ({ colorMap, nameMap }),
    [colorMap, nameMap]
  );

  const limitedKeys = useMemo(() => new Set(limits.map((limit) => limit.categoryKey)), [limits]);

  const availableCategories = useMemo(() => {
    if (editingKey) {
      return categories.filter(
        (category) => category.key === editingKey || !limitedKeys.has(category.key)
      );
    }
    return categories.filter((category) => !limitedKeys.has(category.key));
  }, [categories, limitedKeys, editingKey]);

  const loadLimits = useCallback(async () => {
    try {
      const response = await fetch('/api/category-limits');
      const data = (await response.json()) as { limits?: CategoryLimitRecord[]; error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      setLimits(data.limits ?? []);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void loadLimits();
  }, [loadLimits]);

  function openCreateForm() {
    setEditingKey(null);
    setCategoryKey(availableCategories[0]?.key ?? '');
    setLimitAmount('');
    setIsFormOpen(true);
  }

  function openEditForm(limit: CategoryLimitRecord) {
    setEditingKey(limit.categoryKey);
    setCategoryKey(limit.categoryKey);
    setLimitAmount(String(limit.limitAmount));
    setIsFormOpen(true);
  }

  async function handleSaveLimit() {
    const parsedAmount = Number(limitAmount);

    if (!categoryKey) {
      toast.error(t('settings.categoryLimits.errors.invalidCategory'));
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('settings.categoryLimits.errors.invalidAmount'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/category-limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryKey, limitAmount: parsedAmount }),
      });

      const data = (await response.json()) as {
        limit?: CategoryLimitRecord;
        error?: string;
      };

      if (!response.ok || !data.limit) {
        toast.error(translateError(data.error ?? 'settings.errors.updateFailed', locale));
        return;
      }

      setLimits((current) => {
        const without = current.filter((item) => item.categoryKey !== data.limit!.categoryKey);
        return [...without, data.limit!].sort((a, b) => a.categoryKey.localeCompare(b.categoryKey));
      });
      toast.success(t('settings.categoryLimits.success.saved'));
      setIsFormOpen(false);
      setEditingKey(null);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLimit(key: string) {
    setDeletingKey(key);

    try {
      const response = await fetch('/api/category-limits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryKey: key }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'settings.errors.updateFailed', locale));
        return;
      }

      setLimits((current) => current.filter((item) => item.categoryKey !== key));
      toast.success(t('settings.categoryLimits.success.deleted'));
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setDeletingKey(null);
    }
  }

  if (isLoading || isCategoriesLoading) {
    return <div className="bg-elevated h-48 animate-pulse rounded-2xl" />;
  }

  return (
    <>
      <section className="panel relative z-10 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
              {t('settings.categoryLimits.title')}
            </h2>
            <p className="text-muted relative z-10 mt-1 text-sm">
              {t('settings.categoryLimits.subtitle')}
            </p>
          </div>
          <Button
            type="button"
            size="default"
            disabled={availableCategories.length === 0 && !editingKey}
            onClick={openCreateForm}
            aria-label={t('settings.categoryLimits.add')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {limits.length === 0 ? (
          <p className="text-muted relative z-10 mt-4 text-sm">
            {t('settings.categoryLimits.empty')}
          </p>
        ) : (
          <ul className="relative z-10 mt-4 space-y-2">
            {limits.map((limit) => (
              <li
                key={limit.categoryKey}
                className="hover:bg-elevated/50 flex items-center justify-between gap-3 rounded-lg px-2 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(limit.categoryKey, displayContext),
                    }}
                  />
                  <span className="truncate text-sm text-[var(--text)]">
                    {resolveCategoryLabel(limit.categoryKey, t, displayContext)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm text-[var(--text)]">
                    {new Intl.NumberFormat(locale, {
                      style: 'currency',
                      currency: primaryCurrency,
                      maximumFractionDigits: 0,
                    }).format(limit.limitAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditForm(limit)}
                    className="text-muted hover:text-warm rounded p-1 transition"
                    aria-label={t('settings.categoryLimits.edit')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={deletingKey === limit.categoryKey}
                    onClick={() => void handleDeleteLimit(limit.categoryKey)}
                    className="text-muted hover:text-glow rounded p-1 transition disabled:opacity-50"
                    aria-label={t('settings.categoryLimits.delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingKey(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {t(
                editingKey
                  ? 'settings.categoryLimits.editTitle'
                  : 'settings.categoryLimits.addTitle'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="category-limit-key">
                {t('settings.categoryLimits.categoryLabel')}
              </Label>
              <select
                id="category-limit-key"
                value={categoryKey}
                disabled={isSaving || Boolean(editingKey)}
                onChange={(event) => setCategoryKey(event.target.value)}
                className="auth-input mt-2 flex h-10 w-full"
              >
                {availableCategories.map((category) => (
                  <option key={category.key} value={category.key}>
                    {getCategoryOptionLabel(category, t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="category-limit-amount">
                {t('settings.categoryLimits.amountLabel', { currency: primaryCurrency })}
              </Label>
              <Input
                id="category-limit-amount"
                type="number"
                min={1}
                step="0.01"
                value={limitAmount}
                disabled={isSaving}
                onChange={(event) => setLimitAmount(event.target.value)}
                placeholder={t('settings.categoryLimits.amountPlaceholder')}
                className="mt-2"
              />
              <p className="text-muted mt-1 text-xs">{t('settings.categoryLimits.amountHint')}</p>
            </div>
            <Button
              type="button"
              className="w-full"
              loading={isSaving}
              disabled={isSaving || !categoryKey}
              onClick={() => void handleSaveLimit()}
            >
              {t('settings.labels.saveChanges')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
