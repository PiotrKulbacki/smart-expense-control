import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TRANSACTION_ERROR_CODES } from '@shared/features/transactions/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  deleteTransactionGroup,
  updateTransactionGroupShared,
} from '@web/features/transactions/services/transaction.service';

const updateGroupSchema = z
  .object({
    description: z.string().max(500).optional(),
    date: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: TRANSACTION_ERROR_CODES.INVALID_AMOUNT,
  });

type RouteContext = {
  params: Promise<{ receiptGroupId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { receiptGroupId } = await context.params;
    const body = await request.json();
    const parsed = updateGroupSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const transactions = await updateTransactionGroupShared(user.id, receiptGroupId, parsed.data);

    if (!transactions.length) {
      return jsonError('transactions.errors.notFound', 404);
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    if (error instanceof Error && error.message === TRANSACTION_ERROR_CODES.FORBIDDEN) {
      return jsonError(TRANSACTION_ERROR_CODES.FORBIDDEN, 403);
    }

    return jsonError('auth.errors.generic', 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { receiptGroupId } = await context.params;
    const deleted = await deleteTransactionGroup(user.id, receiptGroupId);

    if (!deleted) {
      return jsonError('transactions.errors.notFound', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === TRANSACTION_ERROR_CODES.FORBIDDEN) {
      return jsonError(TRANSACTION_ERROR_CODES.FORBIDDEN, 403);
    }

    return jsonError('auth.errors.generic', 500);
  }
}
