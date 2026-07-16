import { z } from 'zod';

export const CATEGORY_LIMIT_ERROR_CODES = {
  INVALID_CATEGORY: 'settings.categoryLimits.errors.invalidCategory',
  INVALID_AMOUNT: 'settings.categoryLimits.errors.invalidAmount',
  NOT_FOUND: 'settings.categoryLimits.errors.notFound',
  DUPLICATE: 'settings.categoryLimits.errors.duplicate',
} as const;

export const upsertCategoryLimitSchema = z.object({
  categoryKey: z.string().trim().min(1, CATEGORY_LIMIT_ERROR_CODES.INVALID_CATEGORY),
  limitAmount: z
    .number({ invalid_type_error: CATEGORY_LIMIT_ERROR_CODES.INVALID_AMOUNT })
    .positive(CATEGORY_LIMIT_ERROR_CODES.INVALID_AMOUNT)
    .max(1_000_000_000, CATEGORY_LIMIT_ERROR_CODES.INVALID_AMOUNT),
});

export const deleteCategoryLimitSchema = z.object({
  categoryKey: z.string().trim().min(1, CATEGORY_LIMIT_ERROR_CODES.INVALID_CATEGORY),
});

export type UpsertCategoryLimitInput = z.infer<typeof upsertCategoryLimitSchema>;
export type DeleteCategoryLimitInput = z.infer<typeof deleteCategoryLimitSchema>;

export type CategoryLimitRecord = {
  categoryKey: string;
  limitAmount: number;
};

export type CategoryLimitProgress = {
  categoryKey: string;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  /** Spent / limit × 100; may exceed 100 when over limit */
  percentage: number;
  isOverLimit: boolean;
};

export function computeCategoryLimitProgress(
  categoryKey: string,
  limitAmount: number,
  spentAmount: number
): CategoryLimitProgress {
  const safeLimit = Math.max(limitAmount, 0);
  const safeSpent = Math.max(spentAmount, 0);
  const percentage = safeLimit > 0 ? Math.round((safeSpent / safeLimit) * 100) : 0;
  const remainingAmount = Math.max(Math.round((safeLimit - safeSpent) * 100) / 100, 0);

  return {
    categoryKey,
    limitAmount: safeLimit,
    spentAmount: Math.round(safeSpent * 100) / 100,
    remainingAmount,
    percentage,
    isOverLimit: safeSpent > safeLimit,
  };
}

/**
 * Hue for progress bar: green (120) at 0% → red (0) at 100%+.
 */
export function getCategoryLimitProgressHue(percentage: number): number {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  return 120 - (clamped / 100) * 120;
}

export function buildCategoryLimitProgressList(
  limits: CategoryLimitRecord[],
  categoryTotals: Array<{ category: string; amount: number }>
): CategoryLimitProgress[] {
  const spentByCategory = new Map(
    categoryTotals.map((item) => [item.category, item.amount] as const)
  );

  return limits
    .map((limit) =>
      computeCategoryLimitProgress(
        limit.categoryKey,
        limit.limitAmount,
        spentByCategory.get(limit.categoryKey) ?? 0
      )
    )
    .sort((a, b) => b.percentage - a.percentage);
}
