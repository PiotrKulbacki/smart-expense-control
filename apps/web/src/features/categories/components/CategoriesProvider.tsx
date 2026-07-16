'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import { useLocale } from '@web/features/i18n/LocaleProvider';
import { fetchCategories } from '@web/features/query/fetchers';
import { queryKeys } from '@web/features/query/query-keys';

type CategoriesContextValue = {
  categories: CategoryListItem[];
  colorMap: Map<string, string>;
  nameMap: Map<string, string>;
  isLoading: boolean;
  reload: () => Promise<void>;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
  });

  useEffect(() => {
    if (!isError) {
      return;
    }

    toast.error(
      translateError(error instanceof Error ? error.message : 'auth.errors.generic', locale)
    );
  }, [error, isError, locale]);

  const loadCategories = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    } catch {
      toast.error(translateError('auth.errors.networkError', locale));
    }
  }, [locale, queryClient]);

  const colorMap = useMemo(
    () => new Map(categories.map((category) => [category.key, category.color])),
    [categories]
  );

  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.key, category.isCustom ? category.name : category.key);
    }
    return map;
  }, [categories]);

  const value = useMemo(
    () => ({
      categories,
      colorMap,
      nameMap,
      isLoading: isLoading || isFetching,
      reload: loadCategories,
    }),
    [categories, colorMap, nameMap, isLoading, isFetching, loadCategories]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategoriesContext(): CategoriesContextValue {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return context;
}
