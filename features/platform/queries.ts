import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { AuditRepository } from "@/repositories/audit-repository";
import { PlatformRepository } from "@/repositories/platform-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { DomainRepository } from "@/repositories/domain-repository";
import {
  JobRunRepository,
  RETENTION_JOB,
  REVIEW_AUTOMATION_JOB,
} from "@/repositories/job-run-repository";
import { isCronStale, minutesSince } from "@/lib/platform/health";
import { SubscriptionRepository } from "@/repositories/subscription-repository";
import { getEntitlement } from "@/features/billing/queries";
import type { Entitlement, Plan } from "@/types/billing";
import type { Business } from "@/types/business-entity";
import type { BusinessDomain } from "@/types/domain";
import type {
  AuditListQuery,
  AuditListResult,
  PlatformBusinessCounts,
  PlatformBusinessListQuery,
  PlatformBusinessListResult,
  PlatformGrowth,
  PlatformHealth,
  PlatformStats,
} from "@/types/platform";

/**
 * Read helpers for the super admin portal (Server Components only).
 *
 * Every one of these calls `requirePlatformAdmin()` first, so authorization is
 * enforced per request and never inferred from navigation. The database gates it
 * a second time via the platform read policies (migration 0012).
 */

export async function getPlatformStats(): Promise<PlatformStats> {
  const { supabase } = await requirePlatformAdmin();
  return new PlatformRepository(supabase).stats();
}

export async function getPlatformBusinesses(
  query: PlatformBusinessListQuery,
): Promise<PlatformBusinessListResult> {
  const { supabase } = await requirePlatformAdmin();
  return new PlatformRepository(supabase).listBusinesses(query);
}

/**
 * The audit trail: session start/end plus every mutation staff made while
 * acting as a tenant. Optionally narrowed to one business or one staff member.
 */
export async function getAuditTrail(
  query: Partial<AuditListQuery> = {},
): Promise<AuditListResult> {
  const { supabase } = await requirePlatformAdmin();
  return new AuditRepository(supabase).list({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
    actingBusinessId: query.actingBusinessId,
    actorUserId: query.actorUserId,
  });
}

export async function getPlatformGrowth(months = 6): Promise<PlatformGrowth> {
  const { supabase } = await requirePlatformAdmin();
  return new PlatformRepository(supabase).growth(months);
}

/**
 * System health: is the scheduler alive, is the queue draining, and which
 * capabilities are actually configured in this environment.
 */
export async function getPlatformHealth(): Promise<PlatformHealth> {
  const { supabase } = await requirePlatformAdmin();

  const jobRuns = new JobRunRepository(supabase);
  const [lastRun, retentionLastRun, queue] = await Promise.all([
    jobRuns.latest(REVIEW_AUTOMATION_JOB),
    jobRuns.latest(RETENTION_JOB),
    new PlatformRepository(supabase).queueHealth(),
  ]);

  const failedMessages = await new PlatformRepository(
    supabase,
  ).failedMessages();
  const minutes = minutesSince(lastRun?.startedAt);

  return {
    lastRun,
    minutesSinceLastRun: minutes,
    cronStale: isCronStale(minutes),
    queued: queue.queued,
    oldestQueuedAt: queue.oldestQueuedAt,
    failedMessages,
    retentionLastRun,
    minutesSinceRetention: minutesSince(retentionLastRun?.startedAt),
    smsConfigured: Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    ),
    edgeConfigConfigured: Boolean(process.env.EDGE_CONFIG),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    domainProvisioningConfigured: Boolean(
      process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID,
    ),
  };
}

/** Plan catalogue + what one business currently resolves to. */
export async function getBusinessBilling(businessId: string): Promise<{
  plans: Plan[];
  entitlement: Entitlement;
  overrides: Record<string, boolean>;
}> {
  const { supabase } = await requirePlatformAdmin();
  const repo = new SubscriptionRepository(supabase);

  const [plans, entitlement, overrides] = await Promise.all([
    repo.listPlans(),
    getEntitlement(supabase, businessId),
    repo.overridesFor(businessId),
  ]);

  return { plans, entitlement, overrides };
}

export async function getPlatformBusiness(id: string): Promise<{
  business: Business | null;
  counts: PlatformBusinessCounts;
  domains: BusinessDomain[];
}> {
  const { supabase } = await requirePlatformAdmin();

  const [business, counts, domains] = await Promise.all([
    new BusinessRepository(supabase).findById(id),
    new PlatformRepository(supabase).businessCounts(id),
    new DomainRepository(supabase).listForBusiness(id),
  ]);

  return { business, counts, domains };
}
