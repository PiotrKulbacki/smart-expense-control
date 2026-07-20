import { NextResponse } from 'next/server';
import { prisma } from '@lyamo/database';
import { buildCustomCategoryKey } from '@shared/features/transactions/categories';
import {
  deleteUserCategorySchema,
  updateUserCategorySchema,
} from '@shared/features/transactions/category-schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  countTransactionsForCategory,
  migrateCategoryTransactions,
  validateCategoryForUser,
} from '@web/features/categories/services/category.service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { id } = await context.params;
    const categoryKey = buildCustomCategoryKey(id);

    const existing = await prisma.userCategory.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return jsonError('settings.categories.errors.notFound', 404);
    }

    const body = (await request.json()) as unknown;
    const parsed = updateUserCategorySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'auth.errors.generic', 400);
    }

    if (parsed.data.name) {
      const duplicate = await prisma.userCategory.findFirst({
        where: {
          userId: user.id,
          name: { equals: parsed.data.name, mode: 'insensitive' },
          NOT: { id: id },
        },
      });

      if (duplicate) {
        return jsonError('settings.categories.errors.duplicateName', 409);
      }
    }

    const updated = await prisma.userCategory.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      },
    });

    return NextResponse.json({
      category: {
        key: categoryKey,
        name: updated.name,
        color: updated.color ?? '#9ca3af',
        isCustom: true,
        customId: updated.id,
      },
    });
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

    const existing = await prisma.userCategory.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return jsonError('settings.categories.errors.notFound', 404);
    }

    const categoryKey = buildCustomCategoryKey(id);
    const body = (await request.json().catch(() => ({}))) as unknown;
    const parsed = deleteUserCategorySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'auth.errors.generic', 400);
    }

    const transactionCount = await countTransactionsForCategory(user.id, categoryKey);

    if (transactionCount > 0) {
      const migrateTo = parsed.data.migrateToCategory;

      if (!migrateTo) {
        return NextResponse.json(
          {
            error: 'settings.categories.errors.hasTransactions',
            transactionCount,
          },
          { status: 409 }
        );
      }

      if (migrateTo === categoryKey) {
        return jsonError('settings.categories.errors.invalidMigrateTarget', 400);
      }

      const isValidTarget = await validateCategoryForUser(user.id, migrateTo);
      if (!isValidTarget) {
        return jsonError('settings.categories.errors.invalidMigrateTarget', 400);
      }

      await migrateCategoryTransactions(user.id, categoryKey, migrateTo);
    }

    await prisma.$transaction([
      prisma.userCategoryLimit.deleteMany({ where: { userId: user.id, categoryKey } }),
      prisma.userCategory.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
