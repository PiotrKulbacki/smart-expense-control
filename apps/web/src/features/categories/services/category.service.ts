import { prisma } from '@lyamo/database';
import {
  buildCustomCategoryKey,
  isBuiltInCategory,
  parseCustomCategoryId,
  TRANSACTION_CATEGORIES,
} from '@shared/features/transactions/categories';
import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import { CATEGORY_CHART_COLORS } from '@web/features/transactions/lib/category-config';

const DEFAULT_CUSTOM_COLOR = '#9ca3af';

export function getBuiltInCategoryColor(key: string): string {
  if (isBuiltInCategory(key)) {
    return CATEGORY_CHART_COLORS[key];
  }

  return DEFAULT_CUSTOM_COLOR;
}

export async function listUserCategories(userId: string): Promise<CategoryListItem[]> {
  const customCategories = await prisma.userCategory.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  const builtIn: CategoryListItem[] = TRANSACTION_CATEGORIES.map((key) => ({
    key,
    name: key,
    color: getBuiltInCategoryColor(key),
    isCustom: false,
  }));

  const custom: CategoryListItem[] = customCategories.map((category) => ({
    key: buildCustomCategoryKey(category.id),
    name: category.name,
    color: category.color ?? DEFAULT_CUSTOM_COLOR,
    isCustom: true,
    customId: category.id,
  }));

  return [...builtIn, ...custom];
}

export async function getAllowedCategoryKeys(userId: string): Promise<Set<string>> {
  const categories = await listUserCategories(userId);
  return new Set(categories.map((category) => category.key));
}

export async function validateCategoryForUser(userId: string, category: string): Promise<boolean> {
  const allowed = await getAllowedCategoryKeys(userId);
  return allowed.has(category);
}

export async function getCategoryColorMap(userId: string): Promise<Map<string, string>> {
  const categories = await listUserCategories(userId);
  return new Map(categories.map((category) => [category.key, category.color]));
}

export async function getCategoryNameMap(userId: string): Promise<Map<string, string>> {
  const categories = await listUserCategories(userId);
  const map = new Map<string, string>();

  for (const category of categories) {
    map.set(category.key, category.isCustom ? category.name : category.key);
  }

  return map;
}

export async function countTransactionsForCategory(
  userId: string,
  categoryKey: string
): Promise<number> {
  return prisma.transaction.count({
    where: { userId, category: categoryKey },
  });
}

export async function migrateCategoryTransactions(
  userId: string,
  fromCategory: string,
  toCategory: string
): Promise<void> {
  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { userId, category: fromCategory },
      data: { category: toCategory },
    }),
    prisma.recurringExpense.updateMany({
      where: { userId, category: fromCategory },
      data: { category: toCategory },
    }),
  ]);
}

export function assertCustomCategoryKey(categoryKey: string): string {
  const customId = parseCustomCategoryId(categoryKey);
  if (!customId) {
    throw new Error('NOT_CUSTOM');
  }

  return customId;
}
