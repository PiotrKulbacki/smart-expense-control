import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { getUserAiChatQuota } from '@web/features/ai/services/chat.service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const quota = await getUserAiChatQuota(user.id);
    if (!quota) {
      return jsonError('auth.errors.generic', 500);
    }

    return NextResponse.json({
      plan: user.currentPlan,
      quota,
    });
  } catch {
    return jsonError('auth.errors.generic', 500);
  }
}
