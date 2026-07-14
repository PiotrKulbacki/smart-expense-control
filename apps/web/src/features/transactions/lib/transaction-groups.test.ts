import { describe, expect, it } from 'vitest';
import { groupTransactionsForDisplay } from './transaction-groups';
import type { RecentTransaction } from '@web/features/transactions/components/RecentTransactionsList';

describe('groupTransactionsForDisplay', () => {
  const base = {
    currency: 'EUR',
    description: 'Lidl',
    date: '2026-07-14T10:00:00.000Z',
  };

  it('groups transactions with the same receiptGroupId', () => {
    const transactions: RecentTransaction[] = [
      {
        id: '1',
        amount: 5.69,
        convertedAmount: 5.69,
        category: 'Groceries',
        receiptGroupId: 'group-1',
        ...base,
      },
      {
        id: '2',
        amount: 2.58,
        convertedAmount: 2.58,
        category: 'Alcohol',
        receiptGroupId: 'group-1',
        ...base,
      },
      {
        id: '3',
        amount: 4,
        convertedAmount: 4,
        category: 'Transport',
        receiptGroupId: null,
        description: 'Uber',
        currency: 'EUR',
        date: '2026-07-13T10:00:00.000Z',
      },
    ];

    const entries = groupTransactionsForDisplay(transactions);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.kind).toBe('split');
    if (entries[0]?.kind === 'split') {
      expect(entries[0].totalConvertedAmount).toBe(8.27);
      expect(entries[0].transactions).toHaveLength(2);
    }
    expect(entries[1]?.kind).toBe('single');
  });
});
