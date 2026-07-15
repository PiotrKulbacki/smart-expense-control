import { describe, expect, it } from 'vitest';
import {
  flattenSplitsToLineItems,
  groupLineItemsToSplits,
  moveLineItemCategory,
  netReceiptLineDiscounts,
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

  it('nets German discount lines onto the preceding product (Lidl receipt)', () => {
    const lineItems = [
      { name: 'Pringles Sour Cream', amount: 5.58, category: 'Groceries' },
      { name: 'Lidl Plus Rabatt', amount: -2.8, category: 'Groceries' },
      { name: 'Ariel Flüssigwa', amount: 17.95, category: 'Household' },
      { name: 'Preisvorteil', amount: -1.46, category: 'Household' },
    ];

    expect(netReceiptLineDiscounts(lineItems)).toEqual([
      { name: 'Pringles Sour Cream', amount: 2.78, category: 'Groceries' },
      { name: 'Ariel Flüssigwa', amount: 16.49, category: 'Household' },
    ]);
  });

  it('does not fudge the last line item when discounts are missing from AI output', () => {
    const grossLineItems = [
      { name: 'Dattelcherrytomaten', amount: 1.39, category: 'Groceries' },
      { name: 'Pringles Sour Cream', amount: 5.58, category: 'Groceries' },
      { name: 'Ariel Flüssigwa', amount: 17.95, category: 'Household' },
    ];

    const normalized = normalizeReceiptLineItems(
      grossLineItems,
      new Set(['Groceries', 'Household']),
      36.52
    );

    expect(normalized).toBeDefined();
    expect(normalized!.find((item) => item.name.includes('Ariel'))?.amount).toBe(17.95);
    expect(normalized!.find((item) => item.name.includes('Pringles'))?.amount).toBe(5.58);
    expect(sumLineItemAmounts(normalized!)).not.toBe(36.52);
  });

  it('normalizes full Lidl receipt with separate Rabatt lines to receipt total', () => {
    const lineItems = [
      { name: 'Dattelcherrytomaten', amount: 1.39, category: 'Groceries' },
      { name: 'Wrap Turkish Style', amount: 1.99, category: 'Groceries' },
      { name: 'Käse-Schinken Salat', amount: 2.49, category: 'Groceries' },
      { name: 'Salat Hähnchen', amount: 2.49, category: 'Groceries' },
      { name: 'Sandwich Käse Schi', amount: 1.99, category: 'Groceries' },
      { name: 'Pringles Sour Cream', amount: 5.58, category: 'Groceries' },
      { name: 'Lidl Plus Rabatt', amount: -2.8, category: 'Groceries' },
      { name: 'Pure Kornkraft', amount: 1.75, category: 'Groceries' },
      { name: 'Toastbrötchen Mehrk.', amount: 0.99, category: 'Groceries' },
      { name: 'Croissant Nuss', amount: 1.38, category: 'Groceries' },
      { name: 'Schaumfrüchte', amount: 1.39, category: 'Groceries' },
      { name: 'Katjes Yoghurt Gums', amount: 1.39, category: 'Groceries' },
      { name: 'Ariel Flüssigwa', amount: 17.95, category: 'Household' },
      { name: 'Preisvorteil', amount: -1.46, category: 'Household' },
    ];

    const normalized = normalizeReceiptLineItems(
      lineItems,
      new Set(['Groceries', 'Household']),
      36.52
    );

    expect(normalized).toBeDefined();
    expect(sumLineItemAmounts(normalized!)).toBe(36.52);
    expect(groupLineItemsToSplits(normalized!)).toEqual([
      expect.objectContaining({ category: 'Groceries', amount: 20.03 }),
      expect.objectContaining({ category: 'Household', amount: 16.49 }),
    ]);
    expect(normalized!.find((item) => item.name.includes('Pringles'))?.amount).toBe(2.78);
    expect(normalized!.find((item) => item.name.includes('Ariel'))?.amount).toBe(16.49);
  });
});
