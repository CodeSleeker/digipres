import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PlatformRole } from "@/types/platform";
import { PlatformAdminRepository } from "@/repositories/platform-admin-repository";
import { requireUser } from "./require-user";

export interface PlatformContext {
  supabase: SupabaseClient<Database>;
  user: User;
  role: PlatformRole;
}

/**
 * Resolve the acting PLATFORM STAFF member, or send them away.
 *
 * Authorization is always re-checked server-side against `platform_admins` —
 * never inferred from a cookie or client state. A signed-in user who isn't
 * staff is redirected to their own tenant back office rather than shown a 404,
 * because that's where they belong.
 */
export async function requirePlatformAdmin(): Promise<PlatformContext> {
  const { supabase, user } = await requireUser();

  const admin = await new PlatformAdminRepository(supabase).findByUserId(
    user.id,
  );
  if (!admin) redirect("/admin");

  return { supabase, user, role: admin.role };
}

/**
 * Same, but additionally requires the super_admin role — used for actions that
 * change platform staff or platform-wide settings.
 */
export async function requireSuperAdmin(): Promise<PlatformContext> {
  const context = await requirePlatformAdmin();
  if (context.role !== "super_admin") redirect("/platform");
  return context;
}

/**
 * Platform staff who may CHANGE things (super_admin or support). `read_only`
 * staff are sent back to the portal — they can look, not act.
 */
export async function requirePlatformWriter(): Promise<PlatformContext> {
  const context = await requirePlatformAdmin();
  if (context.role === "read_only") redirect("/platform");
  return context;
}

/** Non-redirecting check, for conditional UI. */
export async function getPlatformRole(): Promise<PlatformRole | null> {
  const { supabase, user } = await requireUser();
  const admin = await new PlatformAdminRepository(supabase).findByUserId(
    user.id,
  );
  return admin?.role ?? null;
}
