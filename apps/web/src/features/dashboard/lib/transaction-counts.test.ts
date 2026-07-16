import { describe, expect, it } from 'vitest';
import { countLogicalTransactions } from './transaction-counts';

describe('countLogicalTransactions', () => {
  it('counts singles and groups split receipts as one', () => {
    const result = countLogicalTransactions([
      { receiptGroupId: null, isAiScanned: false },
      { receiptGroupId: null, isAiScanned: true },
      { receiptGroupId: 'g1', isAiScanned: true },
      { receiptGroupId: 'g1', isAiScanned: true },
      { receiptGroupId: 'g1', isAiScanned: true },
      { receiptGroupId: 'g2', isAiScanned: false },
      { receiptGroupId: 'g2', isAiScanned: false },
    ]);

    expect(result).toEqual({
      total: 4,
      manual: 2,
      scanned: 2,
    });
  });

  it('treats a group as scanned when any row is scanned', () => {
    const result = countLogicalTransactions([
      { receiptGroupId: 'g1', isAiScanned: false },
      { receiptGroupId: 'g1', isAiScanned: true },
    ]);

    expect(result).toEqual({
      total: 1,
      manual: 0,
      scanned: 1,
    });
  });

  it('returns zeros for an empty list', () => {
    expect(countLogicalTransactions([])).toEqual({
      total: 0,
      manual: 0,
      scanned: 0,
    });
  });
});
