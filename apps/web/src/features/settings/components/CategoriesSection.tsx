'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@web/components/ui/alert-dialog';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@web/components/ui/sheet';
import {
  getCategoryOptionLabel,
  useCategories,
} from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import {
  getCategoryColor,
  resolveCategoryLabel,
  type CategoryDisplayContext,
} from '@web/features/transactions/lib/category-config';

const PRESET_COLORS = [
  '#16a34a',
  '#2563eb',
  '#d97706',
  '#ea580c',
  '#9333ea',
  '#dc2626',
  '#0891b2',
  '#0d9488',
  '#ec4899',
  '#64748b',
  '#9ca3af',
];

type CategoriesSectionProps = {
  onCategoriesChanged?: () => void;
};

export function CategoriesSection({ onCategoriesChanged }: CategoriesSectionProps) {
  const t = useT();
  const { locale } = useLocale();
  const { categories, colorMap, nameMap, isLoading, reload } = useCategories();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryListItem | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryListItem | null>(null);
  const [migrateToCategory, setMigrateToCategory] = useState('');
  const [deleteTransactionCount, setDeleteTransactionCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayContext: CategoryDisplayContext = useMemo(
    () => ({ colorMap, nameMap }),
    [colorMap, nameMap]
  );

  const customCategories = useMemo(
    () => categories.filter((category) => category.isCustom),
    [categories]
  );
  const systemCategories = useMemo(
    () => categories.filter((category) => !category.isCustom),
    [categories]
  );

  const migrationOptions = categories.filter((item) => item.key !== deleteTarget?.key);

  function openCreateForm() {
    setEditingCategory(null);
    setName('');
    setColor(PRESET_COLORS[0]!);
    setIsFormOpen(true);
  }

  function openEditForm(category: CategoryListItem) {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setIsFormOpen(true);
  }

  async function handleSaveCategory() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t('settings.categories.errors.invalidName'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        editingCategory?.customId
          ? `/api/categories/${editingCategory.customId}`
          : '/api/categories',
        {
          method: editingCategory?.customId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, color }),
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'settings.errors.updateFailed', locale));
        return;
      }

      toast.success(
        t(
          editingCategory
            ? 'settings.categories.success.updated'
            : 'settings.categories.success.created'
        )
      );
      setIsFormOpen(false);
      await reload();
      onCategoriesChanged?.();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCategory() {
    if (!deleteTarget?.customId) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/categories/${deleteTarget.customId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteTransactionCount > 0 ? { migrateToCategory } : {}),
      });

      const data = (await response.json()) as {
        error?: string;
        transactionCount?: number;
      };

      if (response.status === 409 && data.transactionCount) {
        setDeleteTransactionCount(data.transactionCount);
        if (!migrateToCategory && categories.length > 1) {
          const fallback = categories.find((item) => item.key !== deleteTarget.key);
          setMigrateToCategory(fallback?.key ?? '');
        }
        return;
      }

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'settings.errors.updateFailed', locale));
        return;
      }

      toast.success(t('settings.categories.success.deleted'));
      setDeleteTarget(null);
      setMigrateToCategory('');
      setDeleteTransactionCount(0);
      await reload();
      onCategoriesChanged?.();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsDeleting(false);
    }
  }

  function startDelete(category: CategoryListItem) {
    setDeleteTarget(category);
    setMigrateToCategory('');
    setDeleteTransactionCount(0);
  }

  if (isLoading) {
    return <div className="bg-elevated h-48 animate-pulse rounded-2xl" />;
  }

  return (
    <>
      <section className="panel relative z-10 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
              {t('settings.categories.title')}
            </h2>
            <p className="text-muted relative z-10 mt-1 text-sm">
              {t('settings.categories.subtitle')}
            </p>
          </div>
          <Button
            type="button"
            size="default"
            onClick={openCreateForm}
            aria-label={t('settings.categories.add')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative z-10 mt-5">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">
            {t('settings.categories.systemTitle')}
          </p>
          <p className="text-muted mt-1 text-sm">{t('settings.categories.systemHint')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {systemCategories.map((category) => (
              <span
                key={category.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text)]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getCategoryColor(category.key, displayContext) }}
                />
                {resolveCategoryLabel(category.key, t, displayContext)}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-6">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">
            {t('settings.categories.customTitle')}
          </p>
          {customCategories.length === 0 ? (
            <p className="text-muted mt-2 text-sm">{t('settings.categories.customEmpty')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {customCategories.map((category) => (
                <li
                  key={category.key}
                  className="hover:bg-elevated/50 flex items-center justify-between gap-3 rounded-lg px-2 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: getCategoryColor(category.key, displayContext) }}
                    />
                    <span className="truncate text-sm text-[var(--text)]">
                      {resolveCategoryLabel(category.key, t, displayContext)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditForm(category)}
                      className="text-muted hover:text-warm rounded p-1 transition"
                      aria-label={t('settings.categories.edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startDelete(category)}
                      className="text-muted hover:text-glow rounded p-1 transition"
                      aria-label={t('settings.categories.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {t(
                editingCategory ? 'settings.categories.editTitle' : 'settings.categories.addTitle'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="category-name">{t('settings.categories.nameLabel')}</Label>
              <Input
                id="category-name"
                value={name}
                disabled={isSaving}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('settings.categories.namePlaceholder')}
              />
            </div>
            <div>
              <Label>{t('settings.categories.colorLabel')}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setColor(preset)}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      color === preset ? 'border-warm scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset }}
                    aria-label={preset}
                  />
                ))}
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isSaving}
              onClick={() => void handleSaveCategory()}
            >
              {t('settings.labels.saveChanges')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setMigrateToCategory('');
            setDeleteTransactionCount(0);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.categories.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTransactionCount > 0
                ? t('settings.categories.deleteWithTransactions', {
                    count: deleteTransactionCount,
                  })
                : t('settings.categories.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTransactionCount > 0 && (
            <div>
              <Label htmlFor="migrate-category">{t('settings.categories.migrateLabel')}</Label>
              <select
                id="migrate-category"
                value={migrateToCategory}
                disabled={isDeleting}
                onChange={(event) => setMigrateToCategory(event.target.value)}
                className="auth-input mt-2 flex h-10 w-full"
              >
                {migrationOptions.map((category) => (
                  <option key={category.key} value={category.key}>
                    {getCategoryOptionLabel(category, t)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('dashboard.form.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || (deleteTransactionCount > 0 && !migrateToCategory)}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteCategory();
              }}
            >
              {t('settings.categories.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
