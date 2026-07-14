import { prisma, type Transaction } from '@smart-expense-control/database';
import { convertAmount } from '@shared/features/currency';
import type {
  CreateTransactionBatchInput,
  CreateTransactionInput,
  CurrencyCode,
  UpdateTransactionInput,
} from '@shared/features/transactions/schemas';
import { TRANSACTION_ERROR_CODES } from '@shared/features/transactions/schemas';
import { getExchangeRates } from '@web/features/currency/services/currency.service';
import { invalidateAggregationForTransactionDates } from '@web/features/analytics/services/period-aggregation-cache.service';

export type TransactionDto = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  date: string;
  isAiScanned: boolean;
  receiptGroupId: string | null;
  createdAt: string;
};

export type TransactionWithConversionDto = TransactionDto & {
  convertedAmount: number;
};

export type ListTransactionsOptions = {
  from?: Date;
  to?: Date;
  primaryCurrency?: CurrencyCode;
};

function toTransactionDto(transaction: Transaction): TransactionDto {
  return {
    id: transaction.id,
    userId: transaction.userId,
    amount: transaction.amount.toNumber(),
    currency: transaction.currency,
    category: transaction.category,
    description: transaction.description,
    date: transaction.date.toISOString(),
    isAiScanned: transaction.isAiScanned,
    receiptGroupId: transaction.receiptGroupId,
    createdAt: transaction.createdAt.toISOString(),
  };
}

export async function listTransactions(
  userId: string,
  options: ListTransactionsOptions = {}
): Promise<TransactionDto[] | TransactionWithConversionDto[]> {
  const where = {
    userId,
    ...(options.from || options.to
      ? {
          date: {
            ...(options.from && { gte: options.from }),
            ...(options.to && { lte: options.to }),
          },
        }
      : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  if (!options.primaryCurrency) {
    return transactions.map(toTransactionDto);
  }

  const rateMap = await getExchangeRates();

  return transactions.map((transaction) => {
    const dto = toTransactionDto(transaction);
    return {
      ...dto,
      convertedAmount: convertAmount(
        dto.amount,
        dto.currency as CurrencyCode,
        options.primaryCurrency!,
        rateMap
      ),
    };
  });
}

export async function getTransactionById(
  userId: string,
  transactionId: string
): Promise<TransactionDto | null> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || transaction.userId !== userId) {
    return null;
  }

  return toTransactionDto(transaction);
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionDto> {
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      description: input.description,
      date: input.date,
      isAiScanned: input.isAiScanned ?? false,
    },
  });

  await invalidateAggregationForTransactionDates(userId, [input.date]);

  return toTransactionDto(transaction);
}

export async function createTransactionBatch(
  userId: string,
  input: CreateTransactionBatchInput
): Promise<TransactionDto[]> {
  const { shared, splits } = input;
  const receiptGroupId = splits.length > 1 ? crypto.randomUUID() : null;

  const transactions = await prisma.$transaction(
    splits.map((split) =>
      prisma.transaction.create({
        data: {
          userId,
          amount: split.amount,
          currency: shared.currency,
          category: split.category,
          description: shared.description,
          date: shared.date,
          isAiScanned: shared.isAiScanned ?? false,
          receiptGroupId,
        },
      })
    )
  );

  await invalidateAggregationForTransactionDates(userId, [shared.date]);

  return transactions.map(toTransactionDto);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput
): Promise<TransactionDto | null> {
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing) {
    return null;
  }

  if (existing.userId !== userId) {
    throw new Error(TRANSACTION_ERROR_CODES.FORBIDDEN);
  }

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.isAiScanned !== undefined && { isAiScanned: input.isAiScanned }),
    },
  });

  const affectedDates = [existing.date];
  if (input.date !== undefined) {
    affectedDates.push(input.date);
  }

  await invalidateAggregationForTransactionDates(userId, affectedDates);

  return toTransactionDto(transaction);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing) {
    return false;
  }

  if (existing.userId !== userId) {
    throw new Error(TRANSACTION_ERROR_CODES.FORBIDDEN);
  }

  await prisma.transaction.delete({ where: { id: transactionId } });
  await invalidateAggregationForTransactionDates(userId, [existing.date]);
  return true;
}

export async function deleteTransactionGroup(
  userId: string,
  receiptGroupId: string
): Promise<boolean> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, receiptGroupId },
  });

  if (!transactions.length) {
    return false;
  }

  await prisma.$transaction(
    transactions.map((transaction) => prisma.transaction.delete({ where: { id: transaction.id } }))
  );

  await invalidateAggregationForTransactionDates(
    userId,
    transactions.map((transaction) => transaction.date)
  );

  return true;
}

export async function updateTransactionGroupShared(
  userId: string,
  receiptGroupId: string,
  input: Pick<UpdateTransactionInput, 'description' | 'date'>
): Promise<TransactionDto[]> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, receiptGroupId },
  });

  if (!transactions.length) {
    return [];
  }

  if (transactions.some((transaction) => transaction.userId !== userId)) {
    throw new Error(TRANSACTION_ERROR_CODES.FORBIDDEN);
  }

  const updated = await prisma.$transaction(
    transactions.map((transaction) =>
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          ...(input.description !== undefined && { description: input.description }),
          ...(input.date !== undefined && { date: input.date }),
        },
      })
    )
  );

  const affectedDates = transactions.map((transaction) => transaction.date);
  if (input.date !== undefined) {
    affectedDates.push(input.date);
  }

  await invalidateAggregationForTransactionDates(userId, affectedDates);

  return updated.map(toTransactionDto);
}
