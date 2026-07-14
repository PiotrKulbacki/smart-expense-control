'use client';

import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import { useCategoriesContext } from '@web/features/categories/components/CategoriesProvider';
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
