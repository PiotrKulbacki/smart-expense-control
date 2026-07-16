import { prisma } from '@smart-expense-control/database';
import {
  buildCategoryLimitProgressList,
  type CategoryLimitProgress,
  type CategoryLimitRecord,
} from '@shared/features/transactions/category-limit-schemas';
import { validateCategoryForUser } from '@web/features/categories/services/category.service';

export async function listCategoryLimits(userId: string): Promise<CategoryLimitRecord[]> {
  const rows = await prisma.userCategoryLimit.findMany({
    where: { userId },
    orderBy: { categoryKey: 'asc' },
    select: { categoryKey: true, limitAmount: true },
  });

  return rows.map((row) => ({
    categoryKey: row.categoryKey,
    limitAmount: row.limitAmount.toNumber(),
  }));
}

export async function upsertCategoryLimit(
  userId: string,
  categoryKey: string,
  limitAmount: number
): Promise<CategoryLimitRecord | { error: string }> {
  const isValid = await validateCategoryForUser(userId, categoryKey);
  if (!isValid) {
    return { error: 'settings.categoryLimits.errors.invalidCategory' };
  }

  const row = await prisma.userCategoryLimit.upsert({
    where: {
      userId_categoryKey: { userId, categoryKey },
    },
    create: {
      userId,
      categoryKey,
      limitAmount,
    },
    update: {
      limitAmount,
    },
    select: {
      categoryKey: true,
      limitAmount: true,
    },
  });

  return {
    categoryKey: row.categoryKey,
    limitAmount: row.limitAmount.toNumber(),
  };
}

export async function deleteCategoryLimit(
  userId: string,
  categoryKey: string
): Promise<{ success: true } | { error: string }> {
  const existing = await prisma.userCategoryLimit.findUnique({
    where: {
      userId_categoryKey: { userId, categoryKey },
    },
    select: { id: true },
  });

  if (!existing) {
    return { error: 'settings.categoryLimits.errors.notFound' };
  }

  await prisma.userCategoryLimit.delete({
    where: { id: existing.id },
  });

  return { success: true };
}

export async function getCategoryLimitProgressForUser(
  userId: string,
  categoryTotals: Array<{ category: string; amount: number }>
): Promise<CategoryLimitProgress[]> {
  const limits = await listCategoryLimits(userId);
  return buildCategoryLimitProgressList(limits, categoryTotals);
}
