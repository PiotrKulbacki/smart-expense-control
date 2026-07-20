import { NextResponse } from 'next/server';
import { prisma } from '@lyamo/database';
import { buildCustomCategoryKey } from '@shared/features/transactions/categories';
import { createUserCategorySchema } from '@shared/features/transactions/category-schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { listUserCategories } from '@web/features/categories/services/category.service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const categories = await listUserCategories(user.id);
    return NextResponse.json({ categories });
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

    const body = (await request.json()) as unknown;
    const parsed = createUserCategorySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? 'auth.errors.generic', 400);
    }

    const existing = await prisma.userCategory.findFirst({
      where: {
        userId: user.id,
        name: { equals: parsed.data.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      return jsonError('settings.categories.errors.duplicateName', 409);
    }

    const created = await prisma.userCategory.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
      },
    });

    return NextResponse.json({
      category: {
        key: buildCustomCategoryKey(created.id),
        name: created.name,
        color: created.color ?? '#9ca3af',
        isCustom: true,
        customId: created.id,
      },
    });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
