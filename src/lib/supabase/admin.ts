import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client using the secret key. Bypasses RLS.
 * Use ONLY in trusted server contexts (cron routes, privileged fan-out).
 * Never import this from a client component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
