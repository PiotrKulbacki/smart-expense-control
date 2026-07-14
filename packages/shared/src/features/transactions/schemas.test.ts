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
        { category: 'Groceries', amount: 5.69, items: ['Croissant', 'Toast'] },
        { category: 'Household', amount: 2.58, items: ['Persil'] },
      ],
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
