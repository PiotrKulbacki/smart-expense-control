import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { getUserChatHistoryPage } from '@web/features/ai/services/chat.service';
import { requireAiEnabled } from '@web/lib/require-ai-enabled';

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
  const aiDisabled = requireAiEnabled();
  if (aiDisabled) {
    return aiDisabled;
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return jsonError('auth.errors.unauthorized', 401);
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parsePositiveInt(url.searchParams.get('limit'), 30)));
  const page = parsePositiveInt(url.searchParams.get('page'), 0);

  const result = await getUserChatHistoryPage(user.id, limit, page);

  return NextResponse.json(result);
}
