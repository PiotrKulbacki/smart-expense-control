import { describe, expect, it } from 'vitest';
import {
  buildCategoryLimitProgressList,
  computeCategoryLimitProgress,
  getCategoryLimitProgressHue,
  upsertCategoryLimitSchema,
} from './category-limit-schemas';

describe('computeCategoryLimitProgress', () => {
  it('computes remaining and percentage under limit', () => {
    const result = computeCategoryLimitProgress('Groceries', 200, 50);

    expect(result).toEqual({
      categoryKey: 'Groceries',
      limitAmount: 200,
      spentAmount: 50,
      remainingAmount: 150,
      percentage: 25,
      isOverLimit: false,
    });
  });

  it('marks over-limit when spent exceeds limit', () => {
    const result = computeCategoryLimitProgress('Transport', 100, 150);

    expect(result.percentage).toBe(150);
    expect(result.remainingAmount).toBe(0);
    expect(result.isOverLimit).toBe(true);
  });
});

describe('getCategoryLimitProgressHue', () => {
  it('is green at 0% and red at 100%', () => {
    expect(getCategoryLimitProgressHue(0)).toBe(120);
    expect(getCategoryLimitProgressHue(100)).toBe(0);
    expect(getCategoryLimitProgressHue(50)).toBe(60);
  });

  it('clamps above 100% to red', () => {
    expect(getCategoryLimitProgressHue(200)).toBe(0);
  });
});

describe('buildCategoryLimitProgressList', () => {
  it('joins limits with category totals and sorts by percentage desc', () => {
    const result = buildCategoryLimitProgressList(
      [
        { categoryKey: 'Groceries', limitAmount: 200 },
        { categoryKey: 'Transport', limitAmount: 100 },
      ],
      [
        { category: 'Groceries', amount: 40 },
        { category: 'Transport', amount: 90 },
      ]
    );

    expect(result.map((item) => item.categoryKey)).toEqual(['Transport', 'Groceries']);
    expect(result[0]?.percentage).toBe(90);
    expect(result[1]?.percentage).toBe(20);
  });

  it('treats missing spend as zero', () => {
    const result = buildCategoryLimitProgressList([{ categoryKey: 'Health', limitAmount: 50 }], []);

    expect(result[0]?.spentAmount).toBe(0);
    expect(result[0]?.percentage).toBe(0);
  });
});

describe('upsertCategoryLimitSchema', () => {
  it('accepts valid payload', () => {
    const parsed = upsertCategoryLimitSchema.safeParse({
      categoryKey: 'Groceries',
      limitAmount: 250.5,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects non-positive amounts', () => {
    const parsed = upsertCategoryLimitSchema.safeParse({
      categoryKey: 'Groceries',
      limitAmount: 0,
    });
    expect(parsed.success).toBe(false);
  });
});
