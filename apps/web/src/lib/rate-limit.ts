import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@web/env';

const AI_RATE_LIMIT_WINDOW = '1 m';

/** Per-minute burst caps for PRO abuse protection (monthly quota is enforced in DB). */
const AI_RATE_LIMIT_MAX: Record<AiRateLimitScope, number> = {
  scan: 15,
  chat: 30,
};

function shouldFailOpenWithoutRedis(): boolean {
  return true;
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
  limit: number;
  key: string;
};

function buildRateLimitKey(scope: AiRateLimitScope, identifier: string): string {
  return `${AI_RATE_LIMIT_PREFIX[scope]}:${identifier}`;
}

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
  const limit = AI_RATE_LIMIT_MAX[scope];
  const identifier = userId ?? `ip:${getClientIp(request)}`;
  const key = buildRateLimitKey(scope, identifier);
  const limiter = getAiRateLimiter(scope);

  if (!limiter) {
    const failOpen = shouldFailOpenWithoutRedis();

    if (isStrictProduction() && !failOpen) {
      console.log(
        `Rate Limit Check: Key: ${key}, Remaining: 0, Total: ${limit} (no Redis, blocked)`
      );
      return { allowed: false, remaining: 0, reset: 0, limit, key };
    }

    console.log(
      `Rate Limit Check: Key: ${key}, Remaining: ${limit}, Total: ${limit} (no Redis, fail-open)`
    );
    return { allowed: true, remaining: limit, reset: 0, limit, key };
  }

  try {
    const result = await limiter.limit(identifier);

    console.log(`Rate Limit Check: Key: ${key}, Remaining: ${result.remaining}, Total: ${limit}`);

    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit,
      key,
    };
  } catch {
    const failOpen = shouldFailOpenWithoutRedis();

    if (isStrictProduction() && !failOpen) {
      console.log(
        `Rate Limit Check: Key: ${key}, Remaining: 0, Total: ${limit} (Redis error, blocked)`
      );
      return { allowed: false, remaining: 0, reset: 0, limit, key };
    }

    console.log(
      `Rate Limit Check: Key: ${key}, Remaining: ${limit}, Total: ${limit} (Redis error, fail-open)`
    );
    return { allowed: true, remaining: limit, reset: 0, limit, key };
  }
}
