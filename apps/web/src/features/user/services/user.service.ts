import { prisma } from '@smart-expense-control/database';
import type { UpdateUserInput } from '@shared/features/user/schemas';
import { toSafeUser, type SafeUser } from '@web/features/auth/types';

export async function updateUser(userId: string, input: UpdateUserInput): Promise<SafeUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.primaryCurrency !== undefined && { primaryCurrency: input.primaryCurrency }),
      ...(input.financialMonthStartDay !== undefined && {
        financialMonthStartDay: input.financialMonthStartDay,
      }),
    },
  });

  return toSafeUser(user);
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}
