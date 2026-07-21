import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@web/env';

const AI_RATE_LIMIT_WINDOW = '1 m';
const CONTACT_RATE_LIMIT_WINDOW = '1 h';
const CONTACT_RATE_LIMIT_MAX = 5;

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

const CONTACT_RATE_LIMIT_PREFIX = `${UPSTASH_KEY_PREFIX}:contact`;
const AUTH_RATE_LIMIT_PREFIX = `${UPSTASH_KEY_PREFIX}:auth`;
const AUTH_RATE_LIMIT_WINDOW = '1 h';
const AUTH_RATE_LIMIT_MAX = 10;

let redisClient: Redis | null | undefined;
const aiRateLimiters: Partial<Record<AiRateLimitScope, Ratelimit>> = {};
let contactRateLimiter: Ratelimit | null | undefined;
let authRateLimiter: Ratelimit | null | undefined;

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

function getContactRateLimiter(): Ratelimit | null {
  if (contactRateLimiter !== undefined) {
    return contactRateLimiter;
  }

  const redis = getRedisClient();
  if (!redis) {
    contactRateLimiter = null;
    return null;
  }

  contactRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(CONTACT_RATE_LIMIT_MAX, CONTACT_RATE_LIMIT_WINDOW),
    prefix: CONTACT_RATE_LIMIT_PREFIX,
    analytics: true,
  });

  return contactRateLimiter;
}

function getAuthRateLimiter(): Ratelimit | null {
  if (authRateLimiter !== undefined) {
    return authRateLimiter;
  }

  const redis = getRedisClient();
  if (!redis) {
    authRateLimiter = null;
    return null;
  }

  authRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW),
    prefix: AUTH_RATE_LIMIT_PREFIX,
    analytics: true,
  });

  return authRateLimiter;
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

function resolveMissingLimiter(key: string, limit: number): RateLimitResult {
  const failOpen = shouldFailOpenWithoutRedis();

  if (isStrictProduction() && !failOpen) {
    console.log(`Rate Limit Check: Key: ${key}, Remaining: 0, Total: ${limit} (no Redis, blocked)`);
    return { allowed: false, remaining: 0, reset: 0, limit, key };
  }

  console.log(
    `Rate Limit Check: Key: ${key}, Remaining: ${limit}, Total: ${limit} (no Redis, fail-open)`
  );
  return { allowed: true, remaining: limit, reset: 0, limit, key };
}

function resolveLimiterError(key: string, limit: number): RateLimitResult {
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
    return resolveMissingLimiter(key, limit);
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
    return resolveLimiterError(key, limit);
  }
}

export async function checkContactRateLimit(request: Request): Promise<RateLimitResult> {
  const identifier = `ip:${getClientIp(request)}`;
  const key = `${CONTACT_RATE_LIMIT_PREFIX}:${identifier}`;
  const limiter = getContactRateLimiter();

  if (!limiter) {
    return resolveMissingLimiter(key, CONTACT_RATE_LIMIT_MAX);
  }

  try {
    const result = await limiter.limit(identifier);

    console.log(
      `Rate Limit Check: Key: ${key}, Remaining: ${result.remaining}, Total: ${CONTACT_RATE_LIMIT_MAX}`
    );

    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: CONTACT_RATE_LIMIT_MAX,
      key,
    };
  } catch {
    return resolveLimiterError(key, CONTACT_RATE_LIMIT_MAX);
  }
}

export async function checkAuthRateLimit(
  request: Request,
  scope: string,
  userId?: string
): Promise<RateLimitResult> {
  const identifier = userId ? `user:${userId}` : `ip:${getClientIp(request)}`;
  const key = `${AUTH_RATE_LIMIT_PREFIX}:${scope}:${identifier}`;
  const limiter = getAuthRateLimiter();

  if (!limiter) {
    return resolveMissingLimiter(key, AUTH_RATE_LIMIT_MAX);
  }

  try {
    const result = await limiter.limit(`${scope}:${identifier}`);

    console.log(
      `Rate Limit Check: Key: ${key}, Remaining: ${result.remaining}, Total: ${AUTH_RATE_LIMIT_MAX}`
    );

    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: AUTH_RATE_LIMIT_MAX,
      key,
    };
  } catch {
    return resolveLimiterError(key, AUTH_RATE_LIMIT_MAX);
  }
}
