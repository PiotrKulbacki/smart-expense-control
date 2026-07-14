import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@web/env';

const AI_RATE_LIMIT_WINDOW = '1 m';

/** Scan: strict per-minute cap. Chat: abuse-only burst cap (monthly quota is enforced in DB). */
const AI_RATE_LIMIT_MAX: Record<AiRateLimitScope, number> = {
  scan: 5,
  chat: 30,
};

function shouldFailOpenWithoutRedis(scope: AiRateLimitScope): boolean {
  return scope === 'chat';
}

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
    limiter: Ratelimit.slidingWindow(AI_RATE_LIMIT_MAX[scope], AI_RATE_LIMIT_WINDOW),
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
    const noLimiterDebug = {
      scope,
      userId: userId ?? null,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      hasUpstashUrl: !!env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!env.UPSTASH_REDIS_REST_TOKEN,
      isStrictProduction: isStrictProduction(),
    };
    const failOpen = shouldFailOpenWithoutRedis(scope);
    console.log(
      `[RateLimit] No Upstash client/limiter — ${failOpen ? 'fail-open (chat relies on DB quota)' : 'fail-closed in strict production'}`,
      noLimiterDebug
    );
    // #region agent log
    fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '02ac8f' },
      body: JSON.stringify({
        sessionId: '02ac8f',
        runId: 'post-fix',
        hypothesisId: 'H2',
        location: 'apps/web/src/lib/rate-limit.ts:checkAiRateLimit:no-limiter',
        message: 'No Upstash redis client/limiter available',
        data: { ...noLimiterDebug, failOpen },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    if (isStrictProduction() && !failOpen) {
      return { allowed: false, remaining: 0, reset: 0 };
    }

    return { allowed: true, remaining: AI_RATE_LIMIT_MAX[scope], reset: 0 };
  }

  const identifier = userId ?? `ip:${getClientIp(request)}`;
  const beforeLimitDebug = {
    scope,
    identifier,
    ip: getClientIp(request),
    usingUserId: !!userId,
    prefix: AI_RATE_LIMIT_PREFIX[scope],
    maxPerWindow: AI_RATE_LIMIT_MAX[scope],
    window: AI_RATE_LIMIT_WINDOW,
  };
  console.log('[RateLimit] Checking Redis limit', beforeLimitDebug);
  // #region agent log
  fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '02ac8f' },
    body: JSON.stringify({
      sessionId: '02ac8f',
      runId: 'post-fix',
      hypothesisId: 'H1',
      location: 'apps/web/src/lib/rate-limit.ts:checkAiRateLimit:before-limit',
      message: 'About to call limiter.limit',
      data: beforeLimitDebug,
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
    console.log('[RateLimit] Redis limiter.limit threw — fail-closed in strict production', {
      scope,
      identifier,
      isStrictProduction: isStrictProduction(),
      errorName,
      errorMessage,
    });
    // #region agent log
    fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '02ac8f' },
      body: JSON.stringify({
        sessionId: '02ac8f',
        runId: 'post-fix',
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

    const failOpen = shouldFailOpenWithoutRedis(scope);
    if (isStrictProduction() && !failOpen) {
      return { allowed: false, remaining: 0, reset: 0 };
    }
    return { allowed: true, remaining: AI_RATE_LIMIT_MAX[scope], reset: 0 };
  }

  const afterLimitDebug = {
    scope,
    identifier,
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
  if (!result.success) {
    console.log('[RateLimit] Redis limit exceeded (429 source)', afterLimitDebug);
  }
  // #region agent log
  fetch('http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '02ac8f' },
    body: JSON.stringify({
      sessionId: '02ac8f',
      runId: 'post-fix',
      hypothesisId: 'H1',
      location: 'apps/web/src/lib/rate-limit.ts:checkAiRateLimit:after-limit',
      message: 'limiter.limit result',
      data: afterLimitDebug,
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
