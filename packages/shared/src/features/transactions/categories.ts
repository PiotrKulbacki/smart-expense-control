export const CUSTOM_CATEGORY_PREFIX = 'custom:';

export const TRANSACTION_CATEGORIES = [
  'Groceries',
  'Transport',
  'CoffeeShop',
  'Restaurants',
  'Entertainment',
  'Health',
  'Fuel',
  'Household',
  'Cosmetics',
  'Hotels',
  'Alcohol',
  'Accounting',
  'Mechanic',
  'Other',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const OTHER_CATEGORY = 'Other' as const satisfies TransactionCategory;

export const LEGACY_CATEGORY_MIGRATIONS: Record<string, TransactionCategory> = {
  Coffee: 'CoffeeShop',
  Shopping: 'Other',
  Utilities: 'Other',
};

export function normalizeLegacyCategory(value: string): string {
  return LEGACY_CATEGORY_MIGRATIONS[value] ?? value;
}

export function isBuiltInCategory(value: string): value is TransactionCategory {
  return (TRANSACTION_CATEGORIES as readonly string[]).includes(value);
}

export function isCustomCategoryKey(value: string): boolean {
  return value.startsWith(CUSTOM_CATEGORY_PREFIX);
}

export function buildCustomCategoryKey(id: string): string {
  return `${CUSTOM_CATEGORY_PREFIX}${id}`;
}

export function parseCustomCategoryId(value: string): string | null {
  if (!isCustomCategoryKey(value)) {
    return null;
  }

  return value.slice(CUSTOM_CATEGORY_PREFIX.length);
}

/**
 * Sort categories alphabetically by display label, with "Other" always last.
 */
export function sortCategoriesForSelect<T extends { key: string }>(
  categories: readonly T[],
  getLabel: (category: T) => string,
  locale?: string
): T[] {
  return [...categories].sort((a, b) => {
    const aIsOther = a.key === OTHER_CATEGORY;
    const bIsOther = b.key === OTHER_CATEGORY;

    if (aIsOther !== bIsOther) {
      return aIsOther ? 1 : -1;
    }

    return getLabel(a).localeCompare(getLabel(b), locale, { sensitivity: 'base' });
  });
}
