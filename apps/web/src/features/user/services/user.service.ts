import { prisma } from '@smart-expense-control/database';
import type { UpdateUserInput } from '@shared/features/user/schemas';
import { toSafeUser, type SafeUser } from '@web/features/auth/types';
import { clearUserPeriodAggregations } from '@web/features/analytics/services/period-aggregation-cache.service';
import { deleteAllUserReceiptImages } from '@web/features/scanner/services/receipt-storage.service';

export async function updateUser(userId: string, input: UpdateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultMonthlyBudget: true, primaryCurrency: true, financialMonthStartDay: true },
  });

  const isFirstBudgetSet =
    input.defaultMonthlyBudget !== undefined &&
    input.defaultMonthlyBudget !== null &&
    existing?.defaultMonthlyBudget == null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.primaryCurrency !== undefined && { primaryCurrency: input.primaryCurrency }),
      ...(input.financialMonthStartDay !== undefined && {
        financialMonthStartDay: input.financialMonthStartDay,
      }),
      ...(input.defaultMonthlyBudget !== undefined && {
        defaultMonthlyBudget: input.defaultMonthlyBudget,
      }),
      ...(input.currentMonthBudget !== undefined && {
        currentMonthBudget: input.currentMonthBudget,
      }),
      ...(isFirstBudgetSet && {
        currentMonthBudget: input.defaultMonthlyBudget,
      }),
    },
  });

  if (input.primaryCurrency !== undefined && input.primaryCurrency !== existing?.primaryCurrency) {
    await clearUserPeriodAggregations(userId);
  }

  if (
    input.financialMonthStartDay !== undefined &&
    existing?.financialMonthStartDay !== input.financialMonthStartDay
  ) {
    await clearUserPeriodAggregations(userId);
  }

  return toSafeUser(user);
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await deleteAllUserReceiptImages(userId);
  await prisma.user.delete({ where: { id: userId } });
}
