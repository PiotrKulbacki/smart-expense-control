export type LogicalTransactionInput = {
  receiptGroupId: string | null;
  isAiScanned: boolean;
};

export type TransactionCountStats = {
  /** Unique expenses: split receipt groups count as 1 */
  total: number;
  manual: number;
  scanned: number;
};

/**
 * Counts logical transactions for the dashboard.
 * Rows sharing the same `receiptGroupId` (split receipt) count as one transaction.
 * A group is "scanned" if any of its rows has `isAiScanned`.
 */
export function countLogicalTransactions(
  transactions: LogicalTransactionInput[]
): TransactionCountStats {
  const groupScanned = new Map<string, boolean>();
  let manualSingles = 0;
  let scannedSingles = 0;

  for (const transaction of transactions) {
    if (transaction.receiptGroupId) {
      const previous = groupScanned.get(transaction.receiptGroupId) ?? false;
      groupScanned.set(transaction.receiptGroupId, previous || transaction.isAiScanned);
      continue;
    }

    if (transaction.isAiScanned) {
      scannedSingles += 1;
    } else {
      manualSingles += 1;
    }
  }

  let manualGroups = 0;
  let scannedGroups = 0;
  for (const isScanned of groupScanned.values()) {
    if (isScanned) {
      scannedGroups += 1;
    } else {
      manualGroups += 1;
    }
  }

  const manual = manualSingles + manualGroups;
  const scanned = scannedSingles + scannedGroups;

  return {
    total: manual + scanned,
    manual,
    scanned,
  };
}
