import { prisma, type Transaction } from '@lyamo/database';
import { convertAmount } from '@shared/features/currency';
import { getReceiptImageExpiresAt, type PlanType } from '@shared/features/billing/plan-limits';
import type {
  CreateTransactionBatchInput,
  CreateTransactionInput,
  CurrencyCode,
  UpdateTransactionInput,
} from '@shared/features/transactions/schemas';
import { TRANSACTION_ERROR_CODES } from '@shared/features/transactions/schemas';
import { getExchangeRates } from '@web/features/currency/services/currency.service';
import { invalidateAggregationForTransactionDates } from '@web/features/analytics/services/period-aggregation-cache.service';
import {
  deleteReceiptImage,
  deleteReceiptImageIfOrphaned,
} from '@web/features/scanner/services/receipt-storage.service';

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
  receiptImageUrl: string | null;
  imageExpiresAt: string | null;
  createdAt: string;
};

export type TransactionWithConversionDto = TransactionDto & {
  convertedAmount: number;
};

export type ListTransactionsOptions = {
  from?: Date;
  to?: Date;
  primaryCurrency?: CurrencyCode;
  receiptGroupId?: string;
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
    receiptImageUrl: transaction.receiptImageUrl,
    imageExpiresAt: transaction.imageExpiresAt?.toISOString() ?? null,
    createdAt: transaction.createdAt.toISOString(),
  };
}

async function resolveReceiptPersistence(
  userId: string,
  receiptImageUrl: string | null | undefined
): Promise<{ receiptImageUrl: string | null; imageExpiresAt: Date | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true },
  });
  const plan = (user?.currentPlan ?? 'FREE') as PlanType;
  const imageExpiresAt = getReceiptImageExpiresAt(plan);
  const incomingUrl = receiptImageUrl ?? null;

  if (!incomingUrl || !imageExpiresAt) {
    if (incomingUrl) {
      await deleteReceiptImage(incomingUrl);
    }
    return { receiptImageUrl: null, imageExpiresAt: null };
  }

  return { receiptImageUrl: incomingUrl, imageExpiresAt };
}

export async function listTransactions(
  userId: string,
  options: ListTransactionsOptions = {}
): Promise<TransactionDto[] | TransactionWithConversionDto[]> {
  const where = {
    userId,
    ...(options.receiptGroupId ? { receiptGroupId: options.receiptGroupId } : {}),
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
  const receiptPersistence = await resolveReceiptPersistence(userId, input.receiptImageUrl);

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      description: input.description,
      date: input.date,
      isAiScanned: input.isAiScanned ?? false,
      receiptGroupId: input.receiptGroupId ?? null,
      receiptImageUrl: receiptPersistence.receiptImageUrl,
      imageExpiresAt: receiptPersistence.imageExpiresAt,
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
  const receiptGroupId = shared.receiptGroupId ?? (splits.length > 1 ? crypto.randomUUID() : null);
  const receiptPersistence = await resolveReceiptPersistence(userId, shared.receiptImageUrl);

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
          receiptImageUrl: receiptPersistence.receiptImageUrl,
          imageExpiresAt: receiptPersistence.imageExpiresAt,
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

  const { receiptGroupId, receiptImageUrl } = existing;

  await prisma.transaction.delete({ where: { id: transactionId } });
  await invalidateAggregationForTransactionDates(userId, [existing.date]);

  if (receiptGroupId) {
    await deleteReceiptImageIfOrphaned(userId, receiptGroupId, receiptImageUrl);
  }

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

  const receiptImageUrl = transactions.find(
    (transaction) => transaction.receiptImageUrl
  )?.receiptImageUrl;

  await prisma.$transaction(
    transactions.map((transaction) => prisma.transaction.delete({ where: { id: transaction.id } }))
  );

  await invalidateAggregationForTransactionDates(
    userId,
    transactions.map((transaction) => transaction.date)
  );

  await deleteReceiptImageIfOrphaned(userId, receiptGroupId, receiptImageUrl ?? null);

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
