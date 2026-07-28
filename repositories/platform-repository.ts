import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  PlatformBusinessCounts,
  PlatformBusinessListQuery,
  PlatformBusinessListResult,
  PlatformBusinessSummary,
  PlatformGrowth,
  PlatformStats,
} from "@/types/platform";
import {
  bucketByMonth,
  bucketRangeStart,
  monthBuckets,
} from "@/lib/analytics/buckets";

/** Cap on rows pulled for in-memory bucketing. */
const ROW_CAP = 10_000;
import { onboardingPercentage, EMPTY_ONBOARDING } from "@/types/onboarding";
import type { OnboardingProgress } from "@/types/onboarding";

/**
 * CROSS-TENANT reads for the super admin portal.
 *
 * Every query here is unscoped on purpose — that's the point of the platform
 * plane. It only works for platform staff: the "Platform staff can read all …"
 * policies (migration 0012) gate each table on `is_platform_admin()`, so the
 * exact same code returns nothing for a normal tenant owner. Authorization
 * lives in the database, not in this class.
 */
export class PlatformRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** Headline totals across the whole platform. */
  async stats(): Promise<PlatformStats> {
    const [
      businesses,
      activeBusinesses,
      customers,
      appointments,
      messagesSent,
      messagesQueued,
      messagesFailed,
      verifiedDomains,
    ] = await Promise.all([
      this.count("businesses"),
      this.count("businesses", (q) => q.is("deleted_at", null)),
      this.count("customers", (q) => q.is("deleted_at", null)),
      this.count("appointments", (q) => q.is("deleted_at", null)),
      this.count("review_messages", (q) =>
        q.in("status", ["sent", "delivered"]),
      ),
      this.count("review_messages", (q) => q.eq("status", "queued")),
      this.count("review_messages", (q) => q.eq("status", "failed")),
      this.count("business_domains", (q) => q.eq("verified", true)),
    ]);

    return {
      businesses,
      activeBusinesses,
      customers,
      appointments,
      messagesSent,
      messagesQueued,
      messagesFailed,
      verifiedDomains,
    };
  }

  /** Paginated, searchable list of every tenant (including soft-deleted). */
  async listBusinesses(
    query: PlatformBusinessListQuery,
  ): Promise<PlatformBusinessListResult> {
    const { q, page, pageSize } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabase
      .from("businesses")
      .select("id,name,slug,category,google_onboarding,created_at,deleted_at", {
        count: "exact",
      });

    if (q) {
      const term = q.replace(/[,()%*]/g, " ").trim();
      if (term) builder = builder.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
    }

    const { data, error, count } = await builder
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const total = count ?? 0;
    return {
      rows: (data ?? []).map(toSummary),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /** Messages that exhausted all retries. */
  async failedMessages(): Promise<number> {
    return this.count("review_messages", (q) => q.eq("status", "failed"));
  }

  /** Cross-tenant growth over the last `months` months. */
  async growth(months: number): Promise<PlatformGrowth> {
    const buckets = monthBuckets(months);
    const since = bucketRangeStart(months);

    const [businesses, customers, messages] = await Promise.all([
      this.createdDates("businesses", since),
      this.createdDates("customers", since),
      this.sentDates(since),
    ]);

    return {
      months,
      businesses: bucketByMonth(buckets, businesses),
      customers: bucketByMonth(buckets, customers),
      messagesSent: bucketByMonth(buckets, messages),
    };
  }

  /** Queue signals for the health page. */
  async queueHealth(): Promise<{ queued: number; oldestQueuedAt: string | null }> {
    const queued = await this.count("review_messages", (q) =>
      q.eq("status", "queued"),
    );

    const { data, error } = await this.supabase
      .from("review_messages")
      .select("scheduled_at")
      .eq("status", "queued")
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    return { queued, oldestQueuedAt: data?.scheduled_at ?? null };
  }

  private async createdDates(
    table: "businesses" | "customers",
    since: string,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from(table)
      .select("created_at")
      .gte("created_at", since)
      .limit(ROW_CAP);
    if (error) throw error;
    return (data ?? []).map((r) => r.created_at);
  }

  private async sentDates(since: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("review_messages")
      .select("sent_at")
      .not("sent_at", "is", null)
      .gte("sent_at", since)
      .limit(ROW_CAP);
    if (error) throw error;
    return (data ?? [])
      .map((r) => r.sent_at)
      .filter((v): v is string => Boolean(v));
  }

  /** Per-tenant counts for the detail page. */
  async businessCounts(businessId: string): Promise<PlatformBusinessCounts> {
    const [customers, appointments, messagesSent, domains] = await Promise.all([
      this.count("customers", (q) =>
        q.eq("business_id", businessId).is("deleted_at", null),
      ),
      this.count("appointments", (q) =>
        q.eq("business_id", businessId).is("deleted_at", null),
      ),
      this.count("review_messages", (q) =>
        q.eq("business_id", businessId).in("status", ["sent", "delivered"]),
      ),
      this.count("business_domains", (q) => q.eq("business_id", businessId)),
    ]);
    return { customers, appointments, messagesSent, domains };
  }

  /**
   * Cheap exact count. `head: true` means no rows travel — only the count.
   * The filter callback keeps each call a one-liner above.
   */
  private async count(
    table: "businesses" | "customers" | "appointments" | "review_messages" | "business_domains",
    filter?: (
      q: ReturnType<ReturnType<SupabaseClient<Database>["from"]>["select"]>,
    ) => unknown,
  ): Promise<number> {
    const base = this.supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    const query = (filter ? filter(base) : base) as typeof base;
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }
}

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  google_onboarding: Json | null;
  created_at: string;
  deleted_at: string | null;
}

function toSummary(row: BusinessRow): PlatformBusinessSummary {
  const progress = (row.google_onboarding ??
    EMPTY_ONBOARDING) as unknown as OnboardingProgress;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    onboardingPercentage: onboardingPercentage(
      progress?.completedSteps ? progress : EMPTY_ONBOARDING,
    ),
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}
