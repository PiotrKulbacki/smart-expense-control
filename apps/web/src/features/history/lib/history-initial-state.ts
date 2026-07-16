import {
  getPreviousQuotaPeriodStart,
  getQuotaPeriodEnd,
  getQuotaPeriodStart,
} from '@shared/features/billing/financial-month';
import type { SafeUser } from '@web/features/auth/types';
import type { RecentTransaction } from '@web/features/transactions/components/RecentTransactionsList';
import { listTransactions } from '@web/features/transactions/services/transaction.service';

export type HistoryInitialState = {
  periodStart: string;
  periodEnd: string;
  transactions: RecentTransaction[];
};

function toRecentTransactions(
  transactions: Awaited<ReturnType<typeof listTransactions>>
): RecentTransaction[] {
  return transactions.map((transaction) => ({
    id: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    convertedAmount:
      'convertedAmount' in transaction ? transaction.convertedAmount : transaction.amount,
    category: transaction.category,
    description: transaction.description,
    date: transaction.date,
    isAiScanned: transaction.isAiScanned,
    receiptGroupId: transaction.receiptGroupId,
  }));
}

export async function resolveHistoryInitialState(
  user: SafeUser,
  receiptGroupId?: string | null
): Promise<HistoryInitialState> {
  if (receiptGroupId) {
    const groupTransactions = await listTransactions(user.id, {
      receiptGroupId,
      primaryCurrency: user.primaryCurrency,
    });

    const anchor = groupTransactions[0];
    if (anchor) {
      const anchorDate = new Date(anchor.date);
      const periodStart = getQuotaPeriodStart(user.financialMonthStartDay, anchorDate);
      const periodEnd = getQuotaPeriodEnd(periodStart);

      const transactions = await listTransactions(user.id, {
        from: periodStart,
        to: periodEnd,
        primaryCurrency: user.primaryCurrency,
      });

      return {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        transactions: toRecentTransactions(transactions),
      };
    }
  }

  const periodStart = getPreviousQuotaPeriodStart(user.financialMonthStartDay);
  const periodEnd = getQuotaPeriodEnd(periodStart);
  const transactions = await listTransactions(user.id, {
    from: periodStart,
    to: periodEnd,
    primaryCurrency: user.primaryCurrency,
  });

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    transactions: toRecentTransactions(transactions),
  };
}
