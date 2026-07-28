import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PlatformAdmin, PlatformRole } from "@/types/platform";

type Row = Database["public"]["Tables"]["platform_admins"]["Row"];

/**
 * Data access for platform staff.
 *
 * RLS lets any authenticated user read ONLY their own row, so `findByUserId`
 * doubles as the "am I platform staff?" check without exposing the roster.
 * Listing and granting require an actual platform role (super_admin for writes).
 */
export class PlatformAdminRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** The caller's own platform role, or null when they aren't staff. */
  async findByUserId(userId: string): Promise<PlatformAdmin | null> {
    const { data, error } = await this.supabase
      .from("platform_admins")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  /** Full roster — visible to platform staff only (RLS). */
  async list(): Promise<PlatformAdmin[]> {
    const { data, error } = await this.supabase
      .from("platform_admins")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toDomain);
  }

  /** Grant or change a platform role. Super-admin only (enforced by RLS). */
  async grant(
    userId: string,
    role: PlatformRole,
    createdBy: string | null,
  ): Promise<PlatformAdmin> {
    const { data, error } = await this.supabase
      .from("platform_admins")
      .upsert(
        { user_id: userId, role, created_by: createdBy },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  /** Revoke platform access. Super-admin only (enforced by RLS). */
  async revoke(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("platform_admins")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  }
}

function toDomain(row: Row): PlatformAdmin {
  return {
    userId: row.user_id,
    role: row.role,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
