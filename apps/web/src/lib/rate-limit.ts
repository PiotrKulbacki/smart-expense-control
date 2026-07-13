import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@web/env';

const AI_RATE_LIMIT_MAX = 5;
const AI_RATE_LIMIT_WINDOW = '1 m';

export type AiRateLimitScope = 'scan' | 'chat';

const UPSTASH_KEY_PREFIX = 'expense-control';

const AI_RATE_LIMIT_PREFIX: Record<AiRateLimitScope, string> = {
  scan: `${UPSTASH_KEY_PREFIX}:ai:scan`,
  chat: `${UPSTASH_KEY_PREFIX}:ai:chat`,
};

let redisClient: Redis | null | undefined;
const aiRateLimiters: Partial<Record<AiRateLimitScope, Ratelimit>> = {};

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return redisClient;
}

function getAiRateLimiter(scope: AiRateLimitScope): Ratelimit | null {
  const existing = aiRateLimiters[scope];
  if (existing) {
    return existing;
  }

  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(AI_RATE_LIMIT_MAX, AI_RATE_LIMIT_WINDOW),
    prefix: AI_RATE_LIMIT_PREFIX[scope],
    analytics: true,
  });

  aiRateLimiters[scope] = limiter;
  return limiter;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

function isStrictProduction(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    (!process.env.VERCEL && process.env.NODE_ENV === 'production')
  );
}

export async function checkAiRateLimit(
  request: Request,
  scope: AiRateLimitScope,
  userId?: string
): Promise<RateLimitResult> {
  const limiter = getAiRateLimiter(scope);

  if (!limiter) {
    // #region agent log
    fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0d7c5c' },
      body: JSON.stringify({
        sessionId: '0d7c5c',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'apps/web/src/lib/rate-limit.ts:checkAiRateLimit:no-limiter',
        message: 'No Upstash redis client/limiter available',
        data: {
          scope,
          nodeEnv: process.env.NODE_ENV,
          vercel: !!process.env.VERCEL,
          vercelEnv: process.env.VERCEL_ENV ?? null,
          hasUpstashUrl: !!env.UPSTASH_REDIS_REST_URL,
          hasUpstashToken: !!env.UPSTASH_REDIS_REST_TOKEN,
          isStrictProduction: isStrictProduction(),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    if (isStrictProduction()) {
      return { allowed: false, remaining: 0, reset: 0 };
    }

    return { allowed: true, remaining: AI_RATE_LIMIT_MAX, reset: 0 };
  }

  const identifier = userId ?? `ip:${getClientIp(request)}`;
  // #region agent log
  fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0d7c5c' },
    body: JSON.stringify({
      sessionId: '0d7c5c',
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'apps/web/src/lib/rate-limit.ts:checkAiRateLimit:before-limit',
      message: 'About to call limiter.limit',
      data: {
        scope,
        identifier,
        ip: getClientIp(request),
        usingUserId: !!userId,
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        prefix: AI_RATE_LIMIT_PREFIX[scope],
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  let result: Awaited<ReturnType<typeof limiter.limit>>;
  try {
    result = await limiter.limit(identifier);
  } catch (error) {
    const errorName = error instanceof Error ? error.name : null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    // #region agent log
    fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0d7c5c' },
      body: JSON.stringify({
        sessionId: '0d7c5c',
        runId: 'pre-fix',
        hypothesisId: 'H3',
        location: 'apps/web/src/lib/rate-limit.ts:checkAiRateLimit:limit-error',
        message: 'limiter.limit threw (redis/network/config issue likely)',
        data: {
          scope,
          identifier,
          isStrictProduction: isStrictProduction(),
          errorName,
          errorMessage,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    if (isStrictProduction()) {
      return { allowed: false, remaining: 0, reset: 0 };
    }
    return { allowed: true, remaining: AI_RATE_LIMIT_MAX, reset: 0 };
  }

  // #region agent log
  fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0d7c5c' },
    body: JSON.stringify({
      sessionId: '0d7c5c',
      runId: 'pre-fix',
      hypothesisId: 'H4',
      location: 'apps/web/src/lib/rate-limit.ts:checkAiRateLimit:after-limit',
      message: 'limiter.limit result',
      data: {
        scope,
        identifier,
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
