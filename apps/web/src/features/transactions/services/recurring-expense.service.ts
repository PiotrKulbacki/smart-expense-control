import { prisma, type RecurringExpense } from '@lyamo/database';
import type {
  CreateRecurringExpenseInput,
  UpdateRecurringExpenseInput,
} from '@shared/features/transactions/schemas';
import { RECURRING_EXPENSE_ERROR_CODES } from '@shared/features/transactions/schemas';
import { invalidateCurrentPeriodAggregation } from '@web/features/analytics/services/period-aggregation-cache.service';

export type RecurringExpenseDto = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  frequency: string;
  nextDueDate: string;
  isActive: boolean;
};

function toRecurringExpenseDto(expense: RecurringExpense): RecurringExpenseDto {
  return {
    id: expense.id,
    userId: expense.userId,
    amount: expense.amount.toNumber(),
    currency: expense.currency,
    category: expense.category,
    frequency: expense.frequency,
    nextDueDate: expense.nextDueDate.toISOString(),
    isActive: expense.isActive,
  };
}

export async function listRecurringExpenses(userId: string): Promise<RecurringExpenseDto[]> {
  const expenses = await prisma.recurringExpense.findMany({
    where: { userId },
    orderBy: { nextDueDate: 'asc' },
  });

  return expenses.map(toRecurringExpenseDto);
}

export async function getRecurringExpenseById(
  userId: string,
  expenseId: string
): Promise<RecurringExpenseDto | null> {
  const expense = await prisma.recurringExpense.findUnique({
    where: { id: expenseId },
  });

  if (!expense || expense.userId !== userId) {
    return null;
  }

  return toRecurringExpenseDto(expense);
}

export async function createRecurringExpense(
  userId: string,
  input: CreateRecurringExpenseInput
): Promise<RecurringExpenseDto> {
  const expense = await prisma.recurringExpense.create({
    data: {
      userId,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      frequency: input.frequency,
      nextDueDate: input.nextDueDate,
      isActive: input.isActive ?? true,
    },
  });

  await invalidateCurrentPeriodAggregation(userId);

  return toRecurringExpenseDto(expense);
}

export async function updateRecurringExpense(
  userId: string,
  expenseId: string,
  input: UpdateRecurringExpenseInput
): Promise<RecurringExpenseDto | null> {
  const existing = await prisma.recurringExpense.findUnique({
    where: { id: expenseId },
  });

  if (!existing) {
    return null;
  }

  if (existing.userId !== userId) {
    throw new Error(RECURRING_EXPENSE_ERROR_CODES.FORBIDDEN);
  }

  const expense = await prisma.recurringExpense.update({
    where: { id: expenseId },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.nextDueDate !== undefined && { nextDueDate: input.nextDueDate }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  await invalidateCurrentPeriodAggregation(userId);

  return toRecurringExpenseDto(expense);
}

export async function deleteRecurringExpense(userId: string, expenseId: string): Promise<boolean> {
  const existing = await prisma.recurringExpense.findUnique({
    where: { id: expenseId },
  });

  if (!existing) {
    return false;
  }

  if (existing.userId !== userId) {
    throw new Error(RECURRING_EXPENSE_ERROR_CODES.FORBIDDEN);
  }

  await prisma.recurringExpense.delete({ where: { id: expenseId } });
  await invalidateCurrentPeriodAggregation(userId);
  return true;
}
