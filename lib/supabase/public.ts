import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cookie-less anon Supabase client for PUBLIC reads (no session).
 *
 * Because it never calls Next's `cookies()`, a page/route that uses it does NOT
 * opt into dynamic rendering — so tenant pages and the sitemap can be cached
 * (ISR) and invalidated on demand via `revalidatePath` (see lib/tenant/revalidate).
 *
 * Never use for authenticated or tenant-write operations — it carries no user
 * session. RLS still applies (public read of active businesses only).
 */
export function createPublicClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}
