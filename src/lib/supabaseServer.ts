/**
 * Server-only Supabase client factory.
 * NEVER import this from a client component — keep imports inside src/app/api/** only.
 *
 * Uses the service role key so API routes can perform trusted DB operations and
 * verify user JWTs via supabase.auth.getUser(jwt).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createServerSupabaseClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Extracts the Bearer JWT from the Authorization header.
 * Returns null if the header is absent or malformed.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}
