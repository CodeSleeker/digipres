import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  AuditEntry,
  AuditListQuery,
  AuditListResult,
  NewAuditEntry,
} from "@/types/platform";

type Row = Database["public"]["Tables"]["audit_log"]["Row"];

/**
 * Append-only audit trail for platform actions. Readable and writable by
 * platform staff only (RLS); there are deliberately no update/delete methods —
 * the table has no policies for them.
 */
export class AuditRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async record(entry: NewAuditEntry): Promise<void> {
    const { error } = await this.supabase.from("audit_log").insert({
      actor_user_id: entry.actorUserId,
      acting_business_id: entry.actingBusinessId ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      metadata: (entry.metadata ?? {}) as Database["public"]["Tables"]["audit_log"]["Insert"]["metadata"],
      ip: entry.ip ?? null,
    });
    if (error) throw error;
  }

  async list(query: AuditListQuery): Promise<AuditListResult> {
    const { actingBusinessId, actorUserId, page, pageSize } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabase
      .from("audit_log")
      .select("*", { count: "exact" });

    if (actingBusinessId) {
      builder = builder.eq("acting_business_id", actingBusinessId);
    }
    if (actorUserId) builder = builder.eq("actor_user_id", actorUserId);

    const { data, error, count } = await builder
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const total = count ?? 0;
    return {
      rows: (data ?? []).map(toDomain),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

function toDomain(row: Row): AuditEntry {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actingBusinessId: row.acting_business_id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    ip: row.ip,
    createdAt: row.created_at,
  };
}
