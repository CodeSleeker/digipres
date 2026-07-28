import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * The session lives in cookies. This factory wires Supabase's cookie storage to
 * Next's request cookie store so the server always reads the current session and
 * can write refreshed tokens back.
 *
 * `setAll` is wrapped in try/catch because Server Components are not allowed to
 * mutate cookies — in that context the write is a no-op and token refresh is
 * handled by the middleware instead (see lib/supabase/middleware.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    },
  );
}
