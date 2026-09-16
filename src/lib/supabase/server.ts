import { createClient } from "@supabase/supabase-js";

/**
 * Server-only factory — one client per request, authenticated as whoever's
 * access token was forwarded from the browser. This is how API routes
 * respect the same Row Level Security as the client (no service_role key
 * needed for anything a plan member is already allowed to do).
 */
export function createServerSupabaseClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
