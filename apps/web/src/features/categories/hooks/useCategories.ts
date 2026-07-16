'use client';

import { useMemo } from 'react';
import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import { sortCategoriesForSelect } from '@shared/features/transactions/categories';
import { useCategoriesContext } from '@web/features/categories/components/CategoriesProvider';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { getCategoryLabelKey } from '@web/features/transactions/lib/category-config';

export function useCategories() {
  return useCategoriesContext();
}

export function getCategoryOptionLabel(
  category: CategoryListItem,
  t: (key: string) => string
): string {
  if (category.isCustom) {
    return category.name;
  }

  return t(getCategoryLabelKey(category.key));
}

/** Categories sorted A–Z by localized label, with "Other" last — for dropdowns. */
export function useSortedCategoriesForSelect() {
  const { categories, ...rest } = useCategories();
  const t = useT();
  const { locale } = useLocale();

  const sortedCategories = useMemo(
    () =>
      sortCategoriesForSelect(
        categories,
        (category) => getCategoryOptionLabel(category, t),
        locale
      ),
    [categories, t, locale]
  );

  return { categories: sortedCategories, ...rest };
}
