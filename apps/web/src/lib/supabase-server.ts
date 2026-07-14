import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@web/env';

let adminClient: SupabaseClient | null = null;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
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
