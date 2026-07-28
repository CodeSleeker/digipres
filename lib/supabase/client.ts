import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (runs in the browser).
 *
 * Reads the public env vars and stores the session in cookies (so it stays in
 * sync with the server client). Use this only inside `"use client"` components
 * that need direct Supabase access; the email/password flow itself goes through
 * server actions, not this client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
