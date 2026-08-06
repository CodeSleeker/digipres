import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  Creation,
  DigestRun,
  SendableSubscriber,
  Subscriber,
  SubscriberCounts,
} from "@/types/subscriber";

type SubscriberRow = Database["public"]["Tables"]["subscribers"]["Row"];
type CreationRow = Database["public"]["Tables"]["creations"]["Row"];
type DigestRow = Database["public"]["Tables"]["subscriber_digests"]["Row"];

/**
 * Data access for the mailing list. Every method is scoped to a business_id;
 * RLS enforces the same boundary at the database. No business rules here.
 *
 * Note which methods return TOKENS. `findByConfirmToken`, `findByUnsubscribeToken`
 * and `sendable` are reachable only from service-role callers (the public
 * routes and the digest job) — the owner-facing `list` deliberately does not
 * select them, so a token cannot leak through the admin into a browser.
 */
export class SubscriberRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Add an address, or return the row that already exists for it.
   *
   * Upsert rather than insert-then-handle-conflict, because a second signup
   * from the same address is the NORMAL case: people forget, or click twice.
   * The conflict target is the unique index on (business_id, lower(email)).
   *
   * Deliberately does NOT resurrect an unsubscribed row. Someone who opted out
   * and later types their address into a footer box has asked to come back, but
   * proving that is the confirmation email's job — so the row returns to
   * `pending` and stays silent until they click. Re-subscribing a former
   * unsubscriber without that proof is exactly how a list gets reported.
   */
  async upsertPending(input: {
    businessId: string;
    email: string;
    confirmToken: string;
    consentText: string | null;
    source: string | null;
  }): Promise<{ id: string; email: string; status: string; confirmToken: string | null }> {
    const { data, error } = await this.supabase
      .from("subscribers")
      .upsert(
        {
          business_id: input.businessId,
          email: input.email,
          status: "pending",
          confirm_token: input.confirmToken,
          consent_text: input.consentText,
          source: input.source,
        },
        { onConflict: "business_id,email", ignoreDuplicates: false },
      )
      .select("id,email,status,confirm_token")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      email: data.email,
      status: data.status,
      confirmToken: data.confirm_token,
    };
  }

  /** Service-role only: the row behind a confirmation link. */
  async findByConfirmToken(token: string): Promise<{
    id: string;
    businessId: string;
    email: string;
    status: string;
  } | null> {
    const { data, error } = await this.supabase
      .from("subscribers")
      .select("id,business_id,email,status")
      .eq("confirm_token", token)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          id: data.id,
          businessId: data.business_id,
          email: data.email,
          status: data.status,
        }
      : null;
  }

  /** Service-role only: the row behind an unsubscribe link. */
  async findByUnsubscribeToken(token: string): Promise<{
    id: string;
    businessId: string;
    email: string;
    status: string;
  } | null> {
    const { data, error } = await this.supabase
      .from("subscribers")
      .select("id,business_id,email,status")
      .eq("unsubscribe_token", token)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          id: data.id,
          businessId: data.business_id,
          email: data.email,
          status: data.status,
        }
      : null;
  }

  /**
   * Confirm a subscription and BURN THE TOKEN.
   *
   * Clearing `confirm_token` is what makes the link single-use. It also means a
   * second click lands on "already confirmed" rather than silently re-running
   * the update — and a token found in a log or a referrer header later is worth
   * nothing.
   */
  async confirm(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("subscribers")
      .update({
        status: "subscribed",
        confirmed_at: new Date().toISOString(),
        confirm_token: null,
      })
      .eq("id", id);
    if (error) throw error;
  }

  /**
   * Unsubscribe, keeping the row.
   *
   * A deletion would be worse for the person who asked to leave: the address
   * would be free to be added again by the next signup form, and there would be
   * no record that they ever opted out. The token is kept too, so a second
   * click on the same link still lands somewhere sensible.
   */
  async unsubscribe(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        confirm_token: null,
      })
      .eq("id", id);
    if (error) throw error;
  }

  /** Service-role only: everyone this business may mail. */
  async sendable(businessId: string): Promise<SendableSubscriber[]> {
    const { data, error } = await this.supabase
      .from("subscribers")
      .select("id,email,unsubscribe_token")
      .eq("business_id", businessId)
      .eq("status", "subscribed");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      unsubscribeToken: row.unsubscribe_token,
    }));
  }

  /** The owner's list. No tokens selected — see the note on the class. */
  async list(businessId: string, limit = 200): Promise<Subscriber[]> {
    const { data, error } = await this.supabase
      .from("subscribers")
      .select(
        "id,business_id,email,status,consent_text,confirmed_at,unsubscribed_at,source,created_at",
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toSubscriber);
  }

  async counts(businessId: string): Promise<SubscriberCounts> {
    const counts: SubscriberCounts = {
      subscribed: 0,
      pending: 0,
      unsubscribed: 0,
    };
    // Three head-only counts rather than one grouped query: PostgREST has no
    // GROUP BY, and counting in the client would mean fetching every row.
    for (const status of ["subscribed", "pending", "unsubscribed"] as const) {
      const { count, error } = await this.supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", status);
      if (error) throw error;
      counts[status] = count ?? 0;
    }
    return counts;
  }
}

function toSubscriber(row: Partial<SubscriberRow>): Subscriber {
  return {
    id: row.id!,
    businessId: row.business_id!,
    email: row.email!,
    status: row.status!,
    consentText: row.consent_text ?? null,
    confirmedAt: row.confirmed_at ?? null,
    unsubscribedAt: row.unsubscribed_at ?? null,
    source: row.source ?? null,
    createdAt: row.created_at!,
  };
}

/** Data access for the things a business has made. */
export class CreationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async list(businessId: string, limit = 100): Promise<Creation[]> {
    const { data, error } = await this.supabase
      .from("creations")
      .select("*")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toCreation);
  }

  async findById(businessId: string, id: string): Promise<Creation | null> {
    const { data, error } = await this.supabase
      .from("creations")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? toCreation(data) : null;
  }

  /** Published strictly after `from` and up to `to` — the digest's window. */
  async publishedBetween(
    businessId: string,
    from: string,
    to: string,
  ): Promise<Creation[]> {
    const { data, error } = await this.supabase
      .from("creations")
      .select("*")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .gt("published_at", from)
      .lte("published_at", to)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toCreation);
  }

  async create(
    businessId: string,
    input: {
      name: string;
      description: string | null;
      imageUrl: string | null;
      price: string | null;
      publishedAt?: string;
    },
  ): Promise<Creation> {
    const { data, error } = await this.supabase
      .from("creations")
      .insert({
        business_id: businessId,
        name: input.name,
        description: input.description,
        image_url: input.imageUrl,
        price: input.price,
        ...(input.publishedAt ? { published_at: input.publishedAt } : {}),
      })
      .select("*")
      .single();
    if (error) throw error;
    return toCreation(data);
  }

  async update(
    businessId: string,
    id: string,
    input: {
      name?: string;
      description?: string | null;
      imageUrl?: string | null;
      price?: string | null;
      publishedAt?: string;
    },
  ): Promise<void> {
    const patch: Database["public"]["Tables"]["creations"]["Update"] = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
    if (input.price !== undefined) patch.price = input.price;
    if (input.publishedAt !== undefined) patch.published_at = input.publishedAt;

    const { error } = await this.supabase
      .from("creations")
      .update(patch)
      .eq("business_id", businessId)
      .eq("id", id);
    if (error) throw error;
  }

  /** Soft delete — a creation already announced must stay in the record. */
  async softDelete(businessId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("creations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
  }
}

function toCreation(row: CreationRow): Creation {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    price: row.price,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

/** Data access for what has already been sent. */
export class DigestRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** The most recent run, which is where the next window starts. */
  async latest(businessId: string): Promise<DigestRun | null> {
    const { data, error } = await this.supabase
      .from("subscriber_digests")
      .select("*")
      .eq("business_id", businessId)
      .order("covered_to", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toDigest(data) : null;
  }

  async record(input: {
    businessId: string;
    coveredFrom: string;
    coveredTo: string;
    creationCount: number;
    sentCount: number;
    failedCount: number;
  }): Promise<void> {
    const { error } = await this.supabase.from("subscriber_digests").insert({
      business_id: input.businessId,
      covered_from: input.coveredFrom,
      covered_to: input.coveredTo,
      creation_count: input.creationCount,
      sent_count: input.sentCount,
      failed_count: input.failedCount,
    });
    if (error) throw error;
  }

  async history(businessId: string, limit = 12): Promise<DigestRun[]> {
    const { data, error } = await this.supabase
      .from("subscriber_digests")
      .select("*")
      .eq("business_id", businessId)
      .order("covered_to", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toDigest);
  }
}

function toDigest(row: DigestRow): DigestRun {
  return {
    id: row.id,
    businessId: row.business_id,
    coveredFrom: row.covered_from,
    coveredTo: row.covered_to,
    creationCount: row.creation_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at,
  };
}
