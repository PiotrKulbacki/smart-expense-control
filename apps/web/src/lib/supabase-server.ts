import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@web/env';
import { debugIngest } from '@web/lib/debug-ingest';

let adminClient: SupabaseClient | null = null;

export function isSupabaseStorageConfigured(): boolean {
  const hasUrl = Boolean(env.SUPABASE_URL);
  const hasServiceRoleKey = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
  const configured = hasUrl && hasServiceRoleKey;

  // #region agent log
  debugIngest(
    'supabase-server.ts:isSupabaseStorageConfigured',
    'Supabase storage env check',
    {
      hasUrl,
      hasServiceRoleKey,
      configured,
      vercel: Boolean(process.env.VERCEL),
      nodeEnv: process.env.NODE_ENV ?? null,
    },
    'H1'
  );
  // #endregion

  return configured;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!isSupabaseStorageConfigured()) {
    throw new Error('scanner.errors.storageNotConfigured');
  }

  if (!adminClient) {
    adminClient = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
