import type { RecentTransaction } from '@web/features/transactions/components/RecentTransactionsList';

export type SplitTransactionGroup = {
  kind: 'split';
  receiptGroupId: string;
  transactions: RecentTransaction[];
  totalConvertedAmount: number;
  totalOriginalAmount: number;
  description: string | null;
  date: string;
  currency: string;
};

export type DisplayTransactionEntry =
  { kind: 'single'; transaction: RecentTransaction } | SplitTransactionGroup;

export function groupTransactionsForDisplay(
  transactions: RecentTransaction[]
): DisplayTransactionEntry[] {
  const splitGroups = new Map<string, RecentTransaction[]>();
  const singles: RecentTransaction[] = [];

  for (const transaction of transactions) {
    if (transaction.receiptGroupId) {
      const group = splitGroups.get(transaction.receiptGroupId) ?? [];
      group.push(transaction);
      splitGroups.set(transaction.receiptGroupId, group);
      continue;
    }

    singles.push(transaction);
  }

  const entries: DisplayTransactionEntry[] = singles.map((transaction) => ({
    kind: 'single',
    transaction,
  }));

  for (const [receiptGroupId, groupTransactions] of splitGroups) {
    const sorted = [...groupTransactions].sort(
      (left, right) => right.convertedAmount - left.convertedAmount
    );
    const anchor = sorted[0];

    entries.push({
      kind: 'split',
      receiptGroupId,
      transactions: sorted,
      totalConvertedAmount: sorted.reduce((sum, item) => sum + item.convertedAmount, 0),
      totalOriginalAmount: sorted.reduce((sum, item) => sum + item.amount, 0),
      description: anchor.description,
      date: anchor.date,
      currency: anchor.currency,
    });
  }

  return entries.sort((left, right) => {
    const leftDate = left.kind === 'single' ? left.transaction.date : left.date;
    const rightDate = right.kind === 'single' ? right.transaction.date : right.date;
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
}
