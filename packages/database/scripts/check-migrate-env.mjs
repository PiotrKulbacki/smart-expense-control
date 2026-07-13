/**
 * Pre-migrate diagnostic — logs sanitized DB env info (no secrets).
 * Used to debug Vercel P1001 connection failures.
 */

function parseDbUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: parsed.username,
      isPooler: parsed.hostname.includes('pooler.supabase.com'),
      isDirectDb: parsed.hostname.startsWith('db.'),
      hasPgbouncer: parsed.searchParams.get('pgbouncer') === 'true',
    };
  } catch {
    return { parseError: true };
  }
}

function logEvent(hypothesisId, message, data) {
  // Visible in Vercel build logs
  console.log(`[migrate-env-check] ${message}`, JSON.stringify(data));
}

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_DATABASE_URL;

// H1: env vars missing on build
logEvent('H1', 'env_presence', {
  hasDatabaseUrl: Boolean(databaseUrl),
  hasDirectDatabaseUrl: Boolean(directUrl),
  vercel: Boolean(process.env.VERCEL),
  ci: Boolean(process.env.CI),
});

const dbMeta = parseDbUrl(databaseUrl);
const directMeta = parseDbUrl(directUrl);

// H2/H3: wrong URL type for Vercel (direct db.* host vs session pooler)
logEvent('H2', 'database_url_meta', dbMeta);
logEvent('H3', 'direct_database_url_meta', directMeta);

if (directMeta?.isDirectDb && process.env.VERCEL) {
  logEvent('H2', 'vercel_direct_db_host_warning', {
    recommendation:
      'On Vercel, use Supabase Session pooler (port 5432 on pooler host) as DIRECT_DATABASE_URL instead of db.*.supabase.co',
    host: directMeta.host,
  });
}

if (!databaseUrl || !directUrl) {
  console.error('[migrate-env-check] MISSING required env vars for prisma migrate deploy');
  process.exit(1);
}

console.log('[migrate-env-check] OK — env vars present, proceeding to prisma migrate deploy');
