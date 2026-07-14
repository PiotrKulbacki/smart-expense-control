import { NextResponse } from 'next/server';
import { CHAT_ERROR_CODES, chatRequestSchema } from '@shared/features/ai/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import {
  checkAiChatQuota,
  getUserAiChatQuota,
  sendChatMessage,
} from '@web/features/ai/services/chat.service';
import { checkAiRateLimit } from '@web/lib/rate-limit';
import { env } from '@web/env';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const quotaCheck = await checkAiChatQuota(user.id);
    if (!quotaCheck.ok) {
      const planQuota = await getUserAiChatQuota(user.id);
      console.log('[AI Chat 429]', {
        blockReason: 'plan_quota_exceeded',
        userId: user.id,
        errorKey: quotaCheck.error,
        planQuota,
      });
      // #region agent log
      fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '02ac8f' },
        body: JSON.stringify({
          sessionId: '02ac8f',
          runId: 'post-fix',
          hypothesisId: 'H5',
          location: 'apps/web/src/app/api/ai/chat/route.ts:429-quota',
          message: 'Chat blocked by plan quota before rate limit',
          data: {
            blockReason: 'plan_quota_exceeded',
            userId: user.id,
            errorKey: quotaCheck.error,
            planQuota,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
      return jsonError(quotaCheck.error, 429);
    }

    const planQuota = await getUserAiChatQuota(user.id);

    // FREE: monthly DB quota is the business limit — skip Redis per-minute cap.
    // PRO: apply Redis abuse protection (30 req/min) against endpoint spam.
    if (quotaCheck.plan === 'PRO') {
      const rateLimit = await checkAiRateLimit(request, 'chat', user.id);
      if (!rateLimit.allowed) {
        const blockReason = env.UPSTASH_REDIS_REST_URL
          ? 'redis_abuse_rate_limit'
          : 'redis_unavailable';
        console.log('[AI Chat 429]', {
          blockReason,
          userId: user.id,
          rateLimitKey: user.id,
          redisConfigured: !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN,
          rateLimitRemaining: rateLimit.remaining,
          rateLimitReset: rateLimit.reset,
          planQuota,
        });
        // #region agent log
        fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '02ac8f' },
          body: JSON.stringify({
            sessionId: '02ac8f',
            runId: 'post-fix',
            hypothesisId: 'H4',
            location: 'apps/web/src/app/api/ai/chat/route.ts:429-redis',
            message: 'PRO chat blocked by abuse rate limit',
            data: {
              blockReason,
              userId: user.id,
              rateLimitKey: user.id,
              redisConfigured: !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN,
              rateLimitRemaining: rateLimit.remaining,
              rateLimitReset: rateLimit.reset,
              planQuota,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log
        return jsonError(RATE_LIMIT_ERROR, 429);
      }
    } else {
      console.log('[AI Chat] Skipping Redis rate limit for FREE plan — DB quota enforced', {
        userId: user.id,
        planQuota,
      });
      // #region agent log
      fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '02ac8f' },
        body: JSON.stringify({
          sessionId: '02ac8f',
          runId: 'post-fix',
          hypothesisId: 'H4',
          location: 'apps/web/src/app/api/ai/chat/route.ts:skip-redis-free',
          message: 'FREE chat allowed past Redis — DB quota is authoritative',
          data: { userId: user.id, planQuota },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log
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
