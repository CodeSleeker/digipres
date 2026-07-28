import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated user for a Server Action / Server Component, or
 * redirect to /login. Returns the request-scoped Supabase client alongside the
 * user so callers reuse the same session.
 */
export async function requireUser(): Promise<{
  supabase: SupabaseClient<Database>;
  user: User;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}
