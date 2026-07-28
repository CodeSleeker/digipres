import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BusinessDomain, DomainRoute } from "@/types/domain";

type DomainRow = Database["public"]["Tables"]["business_domains"]["Row"];

/**
 * Data access for tenant hostnames (custom domains, apex + www).
 *
 * Two distinct audiences:
 *  - ROUTING (public): `resolveRoute` / `listVerifiedRoutes` / `primaryHostname`
 *    read only `verified` rows — these feed the middleware and canonical URLs.
 *  - OWNER management: scoped to a business_id, mirroring the other repositories.
 *
 * Business slugs are resolved with a second scoped query rather than a typed
 * embed (same approach as AppointmentRepository).
 */
export class DomainRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /* --- Routing (verified only) ------------------------------------------ */

  /** Resolve a hostname to its tenant. Null when unknown or unverified. */
  async resolveRoute(hostname: string): Promise<DomainRoute | null> {
    const host = normalizeHostname(hostname);
    if (!host) return null;

    const { data, error } = await this.supabase
      .from("business_domains")
      .select("hostname,is_primary,business_id")
      .eq("hostname", host)
      .eq("verified", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const slug = await this.slugFor(data.business_id);
    return slug
      ? { hostname: data.hostname, slug, isPrimary: data.is_primary }
      : null;
  }

  /** Every verified hostname → slug pair (Edge Config sync, sitemap). */
  async listVerifiedRoutes(): Promise<DomainRoute[]> {
    const { data, error } = await this.supabase
      .from("business_domains")
      .select("hostname,is_primary,business_id")
      .eq("verified", true);
    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) return [];

    const slugById = await this.slugsFor([
      ...new Set(rows.map((r) => r.business_id)),
    ]);

    return rows.flatMap((r) => {
      const slug = slugById.get(r.business_id);
      return slug
        ? [{ hostname: r.hostname, slug, isPrimary: r.is_primary }]
        : [];
    });
  }

  /** The canonical hostname for a business, if it has a verified primary. */
  async primaryHostname(businessId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("business_domains")
      .select("hostname")
      .eq("business_id", businessId)
      .eq("is_primary", true)
      .eq("verified", true)
      .maybeSingle();
    if (error) throw error;
    return data?.hostname ?? null;
  }

  /* --- Owner management (business-scoped) -------------------------------- */

  /** All hostnames for a business, including unverified (owner view). */
  async listForBusiness(businessId: string): Promise<BusinessDomain[]> {
    const { data, error } = await this.supabase
      .from("business_domains")
      .select("*")
      .eq("business_id", businessId)
      .order("is_primary", { ascending: false })
      .order("hostname", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toDomain);
  }

  async findById(
    businessId: string,
    id: string,
  ): Promise<BusinessDomain | null> {
    const { data, error } = await this.supabase
      .from("business_domains")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  /** Add a hostname (always unverified — verification is server-side). */
  async insert(
    businessId: string,
    hostname: string,
    verificationToken: string | null = null,
  ): Promise<BusinessDomain> {
    const { data, error } = await this.supabase
      .from("business_domains")
      .insert({
        business_id: businessId,
        hostname: normalizeHostname(hostname),
        verification_token: verificationToken,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async remove(businessId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("business_domains")
      .delete()
      .eq("business_id", businessId)
      .eq("id", id);
    if (error) throw error;
  }

  /**
   * Make one hostname primary. Clears the previous primary first so the
   * one-primary-per-business unique index never trips.
   */
  async setPrimary(businessId: string, id: string): Promise<void> {
    const { error: clearError } = await this.supabase
      .from("business_domains")
      .update({ is_primary: false })
      .eq("business_id", businessId)
      .eq("is_primary", true);
    if (clearError) throw clearError;

    const { error } = await this.supabase
      .from("business_domains")
      .update({ is_primary: true })
      .eq("business_id", businessId)
      .eq("id", id);
    if (error) throw error;
  }

  /**
   * Mark a hostname verified. SERVICE-ROLE ONLY — owners are blocked from
   * writing `verified` by column-level grants (migration 0010).
   */
  async markVerified(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("business_domains")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  /* --- Helpers ----------------------------------------------------------- */

  private async slugFor(businessId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("slug")
      .eq("id", businessId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data?.slug ?? null;
  }

  private async slugsFor(ids: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (ids.length === 0) return out;

    const { data, error } = await this.supabase
      .from("businesses")
      .select("id,slug")
      .in("id", ids)
      .is("deleted_at", null);
    if (error) throw error;
    for (const row of data ?? []) out.set(row.id, row.slug);
    return out;
  }
}

/**
 * Valid hostname shape — mirrors the `business_domains_hostname_format` CHECK in
 * migration 0010, so bad input is rejected before it reaches the database.
 */
const HOSTNAME_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function isValidHostname(hostname: string): boolean {
  return HOSTNAME_PATTERN.test(hostname);
}

/** Lowercase + strip scheme, port, path, and any trailing dot. */
export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .split("/")[0]!
    .split(":")[0]!
    .replace(/\.$/, "");
}

function toDomain(row: DomainRow): BusinessDomain {
  return {
    id: row.id,
    businessId: row.business_id,
    hostname: row.hostname,
    isPrimary: row.is_primary,
    verified: row.verified,
    verificationToken: row.verification_token,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
