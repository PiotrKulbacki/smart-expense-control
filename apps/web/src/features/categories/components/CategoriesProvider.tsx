'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import { useLocale } from '@web/features/i18n/LocaleProvider';

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
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      const data = (await response.json()) as {
        categories?: CategoryListItem[];
        error?: string;
      };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      setCategories(data.categories ?? []);
    } catch {
      toast.error(translateError('auth.errors.networkError', locale));
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

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
      isLoading,
      reload: loadCategories,
    }),
    [categories, colorMap, nameMap, isLoading, loadCategories]
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
