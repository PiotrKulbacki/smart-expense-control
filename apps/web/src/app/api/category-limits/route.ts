import { NextResponse } from 'next/server';
import {
  deleteCategoryLimitSchema,
  upsertCategoryLimitSchema,
} from '@shared/features/transactions/category-limit-schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  deleteCategoryLimit,
  listCategoryLimits,
  upsertCategoryLimit,
} from '@web/features/settings/services/category-limits.service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const limits = await listCategoryLimits(user.id);
    return NextResponse.json({ limits });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const body = (await request.json()) as unknown;
    const parsed = upsertCategoryLimitSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'auth.errors.generic', 400);
    }

    const result = await upsertCategoryLimit(
      user.id,
      parsed.data.categoryKey,
      parsed.data.limitAmount
    );

    if ('error' in result) {
      return jsonError(result.error, 400);
    }

    return NextResponse.json({ limit: result });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const body = (await request.json()) as unknown;
    const parsed = deleteCategoryLimitSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'auth.errors.generic', 400);
    }

    const result = await deleteCategoryLimit(user.id, parsed.data.categoryKey);

    if ('error' in result) {
      return jsonError(result.error, 404);
    }

    return NextResponse.json({ success: true });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
