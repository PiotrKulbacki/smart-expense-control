import { NextResponse } from 'next/server';
import { createTransactionBatchSchema } from '@shared/features/transactions/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { validateCategoryForUser } from '@web/features/categories/services/category.service';
import { createTransactionBatch } from '@web/features/transactions/services/transaction.service';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const body = await request.json();
    const parsed = createTransactionBatchSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    for (const split of parsed.data.splits) {
      const isValidCategory = await validateCategoryForUser(user.id, split.category);
      if (!isValidCategory) {
        return jsonError('transactions.errors.invalidCategory', 400);
      }
    }

    const transactions = await createTransactionBatch(user.id, parsed.data);
    return NextResponse.json({ transactions }, { status: 201 });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
