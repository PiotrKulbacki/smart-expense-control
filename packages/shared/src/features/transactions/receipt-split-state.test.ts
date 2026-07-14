import { describe, expect, it } from 'vitest';
import {
  flattenSplitsToLineItems,
  groupLineItemsToSplits,
  moveLineItemCategory,
  normalizeReceiptLineItems,
  sumLineItemAmounts,
} from './receipt-split-state';

describe('receipt-split-state', () => {
  const lineItems = [
    { name: 'Rosa Spritz', amount: 2.58, category: 'Alcohol' },
    { name: 'Croissant', amount: 3.11, category: 'Groceries' },
    { name: 'Persil', amount: 2.58, category: 'Household' },
  ];

  it('groups line items into category splits', () => {
    expect(groupLineItemsToSplits(lineItems)).toEqual([
      { category: 'Alcohol', amount: 2.58, items: [{ name: 'Rosa Spritz', amount: 2.58 }] },
      { category: 'Groceries', amount: 3.11, items: [{ name: 'Croissant', amount: 3.11 }] },
      { category: 'Household', amount: 2.58, items: [{ name: 'Persil', amount: 2.58 }] },
    ]);
  });

  it('moves an item between categories and recalculates groups', () => {
    const moved = moveLineItemCategory(lineItems, 0, 'Groceries');
    expect(groupLineItemsToSplits(moved)).toEqual([
      {
        category: 'Groceries',
        amount: 5.69,
        items: [
          { name: 'Rosa Spritz', amount: 2.58 },
          { name: 'Croissant', amount: 3.11 },
        ],
      },
      { category: 'Household', amount: 2.58, items: [{ name: 'Persil', amount: 2.58 }] },
    ]);
  });

  it('flattens legacy string items into line items using split amount', () => {
    const flattened = flattenSplitsToLineItems([
      {
        category: 'Groceries',
        amount: 5.69,
        items: [
          { name: 'Croissant', amount: 3.11 },
          { name: 'Toast', amount: 2.58 },
        ],
      },
      { category: 'Alcohol', amount: 2.58, items: [{ name: 'Rosa Spritz', amount: 2.58 }] },
    ]);

    expect(flattened).toHaveLength(3);
    expect(flattened[2]).toEqual({
      name: 'Rosa Spritz',
      amount: 2.58,
      category: 'Alcohol',
    });
  });

  it('flattens split items without prices by distributing group amount', () => {
    const flattened = flattenSplitsToLineItems([
      {
        category: 'Groceries',
        amount: 5.69,
        items: [
          { name: 'Croissant', amount: 0 },
          { name: 'Toast', amount: 0 },
        ],
      },
      {
        category: 'Alcohol',
        amount: 2.58,
        items: [{ name: 'Rosa Spritz', amount: 0 }],
      },
    ]);

    expect(flattened).toHaveLength(3);
    expect(sumLineItemAmounts(flattened)).toBe(8.27);
  });

  it('rebalances line items when OCR sum is slightly off', () => {
    const normalized = normalizeReceiptLineItems(
      [
        { name: 'Rosa Spritz', amount: 2.58, category: 'Alcohol' },
        { name: 'Croissant', amount: 5.66, category: 'Groceries' },
      ],
      new Set(['Groceries', 'Alcohol']),
      8.27
    );

    expect(normalized).toBeDefined();
    expect(sumLineItemAmounts(normalized!)).toBe(8.27);
  });
});
