import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { NewLead } from "@/schemas/lead";

/**
 * Persistence for marketing enquiries (migration 0029).
 *
 * Writes go through the SERVICE-ROLE client: `leads` has no INSERT policy, on
 * purpose, so that the only way in is the server action that also enforces the
 * rate limit, the honeypot and the schema.
 */
export class LeadRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** Returns the new row's id, for correlating the alerts with the record. */
  async insert(lead: NewLead): Promise<string> {
    const { data, error } = await this.supabase
      .from("leads")
      .insert({
        kind: lead.kind,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        project_type: lead.projectType,
        preferred_date: lead.preferredDate,
        preferred_time: lead.preferredTime,
        message: lead.message,
        source_ip: lead.sourceIp,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }
}
