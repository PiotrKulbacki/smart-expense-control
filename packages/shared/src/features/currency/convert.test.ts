import { describe, expect, it } from 'vitest';
import { convertAmount, buildRateMapFromPairs } from './convert';

const rates = buildRateMapFromPairs([
  { from: 'PLN', to: 'EUR', rate: 0.23 },
  { from: 'EUR', to: 'PLN', rate: 4.35 },
  { from: 'PLN', to: 'GBP', rate: 0.2 },
  { from: 'GBP', to: 'PLN', rate: 5.05 },
]);

describe('convertAmount', () => {
  it('returns same amount for identical currencies', () => {
    expect(convertAmount(100, 'PLN', 'PLN', rates)).toBe(100);
  });

  it('converts using direct rate', () => {
    expect(convertAmount(100, 'PLN', 'EUR', rates)).toBe(23);
  });

  it('converts via triangulation when direct rate missing', () => {
    const partialRates = buildRateMapFromPairs([
      { from: 'EUR', to: 'PLN', rate: 4.35 },
      { from: 'PLN', to: 'GBP', rate: 0.2 },
    ]);
    expect(convertAmount(10, 'EUR', 'GBP', partialRates)).toBe(8.7);
  });
});
