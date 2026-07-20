import { NextResponse } from 'next/server';
import { createTransactionSchema, type CurrencyCode } from '@shared/features/transactions/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { prisma } from '@lyamo/database';
import { validateCategoryForUser } from '@web/features/categories/services/category.service';
import {
  createTransaction,
  listTransactions,
} from '@web/features/transactions/services/transaction.service';

function parseDateParam(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const from = parseDateParam(searchParams.get('from'));
    const to = parseDateParam(searchParams.get('to'));
    const receiptGroupId = searchParams.get('receiptGroupId') ?? undefined;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { primaryCurrency: true },
    });

    const transactions = await listTransactions(user.id, {
      from,
      to,
      receiptGroupId,
      primaryCurrency: from || to ? (dbUser?.primaryCurrency as CurrencyCode) : undefined,
    });

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

    const isValidCategory = await validateCategoryForUser(user.id, parsed.data.category);
    if (!isValidCategory) {
      return jsonError('transactions.errors.invalidCategory', 400);
    }

    const transaction = await createTransaction(user.id, parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
