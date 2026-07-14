import { describe, expect, it } from 'vitest';
import {
  aggregateRawCategoryTotals,
  appendFixedCostsCategory,
  roundMoney,
  sumRawTransactionAmounts,
} from './period-aggregation';
import { FIXED_COSTS_CATEGORY } from '../transactions/fixed-costs';

describe('period-aggregation helpers', () => {
  it('aggregates raw category totals per currency', () => {
    const totals = aggregateRawCategoryTotals([
      { amount: 10, currency: 'PLN', category: 'Food' },
      { amount: 5, currency: 'PLN', category: 'Food' },
      { amount: 3, currency: 'EUR', category: 'Food' },
    ]);

    expect(totals).toEqual([
      { category: 'Food', total: 15, currency: 'PLN' },
      { category: 'Food', total: 3, currency: 'EUR' },
    ]);
  });

  it('sums raw transaction amounts without conversion', () => {
    expect(
      sumRawTransactionAmounts([
        { amount: 10.5, currency: 'PLN', category: 'Food' },
        { amount: 4.25, currency: 'EUR', category: 'Fuel' },
      ])
    ).toBe(14.75);
  });

  it('appends fixed costs category and sorts by amount', () => {
    const totals = appendFixedCostsCategory(
      [
        { category: 'Food', amount: 20 },
        { category: 'Fuel', amount: 40 },
      ],
      15
    );

    expect(totals[0]).toEqual({ category: 'Fuel', amount: 40 });
    expect(totals[1]).toEqual({ category: 'Food', amount: 20 });
    expect(totals[2]).toEqual({ category: FIXED_COSTS_CATEGORY, amount: 15 });
  });

  it('rounds money to two decimals', () => {
    expect(roundMoney(10.126)).toBe(10.13);
  });
});
