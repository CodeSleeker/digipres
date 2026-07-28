import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client for trusted server jobs (the review-automation
 * cron). It BYPASSES Row Level Security, so it must only ever run server-side
 * in the scheduled processor — never in a request handling user input.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role secret).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
