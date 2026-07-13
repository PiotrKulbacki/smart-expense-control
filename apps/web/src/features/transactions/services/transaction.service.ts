import { prisma, type Transaction } from '@smart-expense-control/database';
import { convertAmount } from '@shared/features/currency';
import type {
  CreateTransactionInput,
  CurrencyCode,
  UpdateTransactionInput,
} from '@shared/features/transactions/schemas';
import { TRANSACTION_ERROR_CODES } from '@shared/features/transactions/schemas';
import { getExchangeRates } from '@web/features/currency/services/currency.service';

export type TransactionDto = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  date: string;
  isAiScanned: boolean;
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

  return toTransactionDto(transaction);
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
  return true;
}
