import { describe, expect, it } from 'vitest';
import {
  createTransactionBatchSchema,
  receiptScanResultSchema,
  splitAmountsMatchTotal,
  sumSplitAmounts,
} from './schemas';

describe('createTransactionBatchSchema', () => {
  const validPayload = {
    shared: {
      totalAmount: 8.27,
      currency: 'EUR' as const,
      description: 'Kaufland',
      date: '2026-07-14',
      isAiScanned: true,
    },
    splits: [
      { category: 'Groceries', amount: 6.27 },
      { category: 'Household', amount: 2.0 },
    ],
  };

  it('accepts splits that sum to the shared total', () => {
    const parsed = createTransactionBatchSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('rejects splits that do not sum to the shared total', () => {
    const parsed = createTransactionBatchSchema.safeParse({
      ...validPayload,
      splits: [
        { category: 'Groceries', amount: 6.27 },
        { category: 'Household', amount: 1.0 },
      ],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toBe('transactions.errors.splitSumMismatch');
    }
  });

  it('allows a small rounding tolerance', () => {
    const parsed = createTransactionBatchSchema.safeParse({
      ...validPayload,
      shared: { ...validPayload.shared, totalAmount: 8.27 },
      splits: [
        { category: 'Groceries', amount: 6.27 },
        { category: 'Household', amount: 2.005 },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects more than five splits', () => {
    const parsed = createTransactionBatchSchema.safeParse({
      ...validPayload,
      splits: Array.from({ length: 6 }, (_, index) => ({
        category: 'Groceries',
        amount: index === 0 ? 3.27 : 1,
      })),
      shared: { ...validPayload.shared, totalAmount: 8.27 },
    });

    expect(parsed.success).toBe(false);
  });
});
describe('receiptScanResultSchema', () => {
  it('accepts grouped category suggestions from AI', () => {
    const parsed = receiptScanResultSchema.safeParse({
      amount: 8.27,
      currency: 'EUR',
      category: 'Groceries',
      description: 'Kaufland',
      date: '2026-07-14',
      needsManualReview: false,
      hasMultipleCategories: true,
      suggestedSplits: [
        {
          category: 'Groceries',
          amount: 5.69,
          items: [
            { name: 'Croissant', amount: 3.11 },
            { name: 'Toast', amount: 2.58 },
          ],
        },
        { category: 'Household', amount: 2.58, items: [{ name: 'Persil', amount: 2.58 }] },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts discount line items with negative amounts', () => {
    const parsed = receiptScanResultSchema.safeParse({
      amount: 36.52,
      currency: 'EUR',
      category: 'Groceries',
      description: 'Lidl',
      date: '2026-07-02',
      needsManualReview: true,
      hasMultipleCategories: true,
      lineItems: [
        { name: 'Salat Hähnchen', amount: 2.49, category: 'Groceries' },
        { name: 'Lidl Plus Rabatt', amount: -2.8, category: 'Groceries' },
        { name: 'Preisvorteil', amount: -1.46, category: 'Groceries' },
      ],
      suggestedSplits: [
        {
          category: 'Groceries',
          amount: 32.26,
          items: [
            { name: 'Salat Hähnchen', amount: 2.49 },
            { name: 'Lidl Plus Rabatt', amount: -2.8 },
          ],
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts USD currency from AI scan result', () => {
    const parsed = receiptScanResultSchema.safeParse({
      amount: 42.5,
      currency: 'USD',
      category: 'Groceries',
      description: 'Whole Foods',
      date: '2026-07-02',
      needsManualReview: false,
      hasMultipleCategories: false,
    });

    expect(parsed.success).toBe(true);
  });
});

describe('split amount helpers', () => {
  it('sums split amounts', () => {
    expect(sumSplitAmounts([{ amount: 6.27 }, { amount: 2 }])).toBe(8.27);
  });

  it('matches totals within tolerance', () => {
    expect(splitAmountsMatchTotal([{ amount: 6.27 }, { amount: 2 }], 8.27)).toBe(true);
    expect(splitAmountsMatchTotal([{ amount: 6.27 }, { amount: 1 }], 8.27)).toBe(false);
  });
});
