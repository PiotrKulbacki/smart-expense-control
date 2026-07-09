import { NextResponse } from 'next/server';
import {
  updateRecurringExpenseSchema,
  RECURRING_EXPENSE_ERROR_CODES,
} from '@shared/features/transactions/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  deleteRecurringExpense,
  getRecurringExpenseById,
  updateRecurringExpense,
} from '@web/features/transactions/services/recurring-expense.service';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { id } = await context.params;
    const recurringExpense = await getRecurringExpenseById(user.id, id);

    if (!recurringExpense) {
      return jsonError(RECURRING_EXPENSE_ERROR_CODES.NOT_FOUND, 404);
    }

    return NextResponse.json({ recurringExpense });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateRecurringExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    try {
      const recurringExpense = await updateRecurringExpense(user.id, id, parsed.data);

      if (!recurringExpense) {
        return jsonError(RECURRING_EXPENSE_ERROR_CODES.NOT_FOUND, 404);
      }

      return NextResponse.json({ recurringExpense });
    } catch (error) {
      if (error instanceof Error && error.message === RECURRING_EXPENSE_ERROR_CODES.FORBIDDEN) {
        return jsonError(RECURRING_EXPENSE_ERROR_CODES.FORBIDDEN, 403);
      }
      throw error;
    }
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { id } = await context.params;

    try {
      const deleted = await deleteRecurringExpense(user.id, id);

      if (!deleted) {
        return jsonError(RECURRING_EXPENSE_ERROR_CODES.NOT_FOUND, 404);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message === RECURRING_EXPENSE_ERROR_CODES.FORBIDDEN) {
        return jsonError(RECURRING_EXPENSE_ERROR_CODES.FORBIDDEN, 403);
      }
      throw error;
    }
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
