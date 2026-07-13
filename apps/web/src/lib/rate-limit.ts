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

export async function checkAiRateLimit(
  request: Request,
  scope: AiRateLimitScope,
  userId?: string
): Promise<RateLimitResult> {
  const limiter = getAiRateLimiter(scope);

  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      return { allowed: false, remaining: 0, reset: 0 };
    }

    return { allowed: true, remaining: AI_RATE_LIMIT_MAX, reset: 0 };
  }

  const identifier = userId ?? `ip:${getClientIp(request)}`;
  const result = await limiter.limit(identifier);

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
