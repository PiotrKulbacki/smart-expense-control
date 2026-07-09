import { NextResponse } from 'next/server';
import { createTransactionSchema } from '@shared/features/transactions/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  createTransaction,
  listTransactions,
} from '@web/features/transactions/services/transaction.service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const transactions = await listTransactions(user.id);
    return NextResponse.json({ transactions });
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
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      return jsonError(firstError, 400);
    }

    const transaction = await createTransaction(user.id, parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
