import { NextResponse } from 'next/server';
import { createRecurringExpenseSchema } from '@shared/features/transactions/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  createRecurringExpense,
  listRecurringExpenses,
} from '@web/features/transactions/services/recurring-expense.service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const recurringExpenses = await listRecurringExpenses(user.id);
    return NextResponse.json({ recurringExpenses });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const body = await request.json();
    const parsed = createRecurringExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const recurringExpense = await createRecurringExpense(user.id, parsed.data);
    return NextResponse.json({ recurringExpense }, { status: 201 });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
