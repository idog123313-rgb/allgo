import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Don't throw at import time — that would take down the whole app (and even
// the production build's static prerender) the moment env vars are missing.
// Fall back to a placeholder so the client can always be constructed; any
// actual request will fail at call time, which callers (AuthProvider et al.)
// already handle as a friendly "couldn't connect" state.
export const isSupabaseConfigured = !!url && !!publishableKey;

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
