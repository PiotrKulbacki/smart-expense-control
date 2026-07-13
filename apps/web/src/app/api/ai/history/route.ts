import { NextResponse } from 'next/server';
import { prisma } from '@smart-expense-control/database';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return jsonError('auth.errors.unauthorized', 401);
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parsePositiveInt(url.searchParams.get('limit'), 30)));
  const page = parsePositiveInt(url.searchParams.get('page'), 0);

  const rows = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    skip: page * limit,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const messages = pageRows
    .reverse()
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .map((row) => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    }));

  return NextResponse.json({ messages, hasMore, page, limit });
}

