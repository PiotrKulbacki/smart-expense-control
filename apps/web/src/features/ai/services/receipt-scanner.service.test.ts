import { describe, expect, it } from 'vitest';
import { receiptScanResultSchema } from '@shared/features/transactions/schemas';
import {
  normalizeReceiptSuggestedSplits,
  resolveReceiptSplitDraft,
} from '@web/features/ai/services/receipt-scan-splits';

const ALLOWED_CATEGORIES = new Set([
  'Groceries',
  'Household',
  'Cosmetics',
  'CoffeeShop',
  'Alcohol',
  'Other',
]);

const KAUFLAND_AI_JSON = {
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
};

describe('normalizeReceiptSuggestedSplits', () => {
  it('accepts valid grouped splits from a mixed supermarket receipt', () => {
    const result = normalizeReceiptSuggestedSplits(
      KAUFLAND_AI_JSON.suggestedSplits,
      ALLOWED_CATEGORIES,
      KAUFLAND_AI_JSON.amount
    );

    expect(result).toEqual(KAUFLAND_AI_JSON.suggestedSplits);
  });

  it('rejects splits when amounts do not match the receipt total', () => {
    const result = normalizeReceiptSuggestedSplits(
      [
        { category: 'Groceries', amount: 5.69 },
        { category: 'Household', amount: 1.0 },
      ],
      ALLOWED_CATEGORIES,
      8.27
    );

    expect(result).toBeUndefined();
  });

  it('filters unknown categories and rejects when fewer than two remain', () => {
    const result = normalizeReceiptSuggestedSplits(
      [
        { category: 'Groceries', amount: 5.69 },
        { category: 'UnknownCategory', amount: 2.58 },
      ],
      ALLOWED_CATEGORIES,
      8.27
    );

    expect(result).toBeUndefined();
  });

  it('normalizes legacy category names before validation', () => {
    const result = normalizeReceiptSuggestedSplits(
      [
        { category: 'Coffee', amount: 4.5 },
        { category: 'Groceries', amount: 3.77 },
      ],
      ALLOWED_CATEGORIES,
      8.27
    );

    expect(result).toEqual([
      { category: 'CoffeeShop', amount: 4.5 },
      { category: 'Groceries', amount: 3.77 },
    ]);
  });

  it('returns undefined for empty or single split input', () => {
    expect(normalizeReceiptSuggestedSplits(undefined, ALLOWED_CATEGORIES, 8.27)).toBeUndefined();
    expect(
      normalizeReceiptSuggestedSplits(
        [{ category: 'Groceries', amount: 8.27 }],
        ALLOWED_CATEGORIES,
        8.27
      )
    ).toBeUndefined();
  });
});

describe('receipt scan AI JSON pipeline', () => {
  it('parses mock Kaufland JSON and produces normalized splits', () => {
    const parsed = receiptScanResultSchema.safeParse(KAUFLAND_AI_JSON);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const normalized = normalizeReceiptSuggestedSplits(
      parsed.data.suggestedSplits,
      ALLOWED_CATEGORIES,
      parsed.data.amount
    );

    expect(normalized).toHaveLength(2);
    expect(normalized?.[0]?.category).toBe('Groceries');
    expect(normalized?.[1]?.category).toBe('Household');
  });

  it('falls back to manual split when AI returns an invalid split sum', () => {
    const parsed = receiptScanResultSchema.safeParse({
      ...KAUFLAND_AI_JSON,
      suggestedSplits: [
        { category: 'Groceries', amount: 5.69 },
        { category: 'Household', amount: 1.0 },
      ],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const normalized = normalizeReceiptSuggestedSplits(
      parsed.data.suggestedSplits,
      ALLOWED_CATEGORIES,
      parsed.data.amount
    );

    expect(normalized).toBeUndefined();
  });
});

describe('resolveReceiptSplitDraft', () => {
  it('prefers normalized line items over suggested splits', () => {
    const result = resolveReceiptSplitDraft(
      {
        amount: 8.27,
        lineItems: [
          { name: 'Rosa Spritz', amount: 2.58, category: 'Alcohol' },
          { name: 'Croissant', amount: 5.69, category: 'Groceries' },
        ],
        suggestedSplits: [{ category: 'Groceries', amount: 8.27 }],
      },
      ALLOWED_CATEGORIES
    );

    expect(result.lineItems).toHaveLength(2);
    expect(result.suggestedSplits).toHaveLength(2);
    expect(result.suggestedSplits?.[0]?.category).toBe('Alcohol');
  });
});
