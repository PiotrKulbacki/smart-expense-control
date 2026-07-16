import { NextResponse } from 'next/server';
import { CHAT_ERROR_CODES, chatRequestSchema } from '@shared/features/ai/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { checkAiChatQuota, sendChatMessage } from '@web/features/ai/services/chat.service';
import { checkAiRateLimit } from '@web/lib/rate-limit';
import { requireAiEnabled } from '@web/lib/require-ai-enabled';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const aiDisabled = requireAiEnabled();
    if (aiDisabled) {
      return aiDisabled;
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const quotaCheck = await checkAiChatQuota(user.id);
    if (!quotaCheck.ok) {
      return jsonError(quotaCheck.error, 429);
    }

    // FREE: monthly DB quota is the business limit — skip Redis per-minute cap.
    // Paid plans: apply Redis abuse protection against endpoint spam.
    if (quotaCheck.plan === 'PRO' || quotaCheck.plan === 'PREMIUM') {
      const rateLimit = await checkAiRateLimit(request, 'chat', user.id);
      if (!rateLimit.allowed) {
        return jsonError(RATE_LIMIT_ERROR, 429);
      }
    }

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(CHAT_ERROR_CODES.INVALID_MESSAGE, 400);
    }

    const result = await sendChatMessage(user.id, parsed.data);

    if ('error' in result) {
      const isQuotaError =
        result.error === CHAT_ERROR_CODES.QUOTA_EXCEEDED ||
        result.error === CHAT_ERROR_CODES.MONTHLY_LIMIT_REACHED;
      const status = isQuotaError ? 429 : 422;
      return jsonError(result.error, status);
    }

    return NextResponse.json({
      reply: result.reply,
      message: 'chat.success.replied',
    });
  } catch {
    return jsonError(CHAT_ERROR_CODES.AI_FAILED, 500);
  }
}
