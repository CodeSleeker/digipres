import type { PlatformRoleEnum } from "./database";
import type { EdgeConfigProbe } from "@/lib/tenant/edge-routing";

/**
 * Platform (super admin) domain types. Distinct from tenant types: these
 * describe staff who operate the platform, not businesses using it.
 */
export type PlatformRole = PlatformRoleEnum;

export const PLATFORM_ROLES: PlatformRole[] = [
  "super_admin",
  "support",
  "read_only",
];

export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  super_admin: "Super admin",
  support: "Support",
  read_only: "Read only",
};

export interface PlatformAdmin {
  userId: string;
  role: PlatformRole;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Append-only record of a platform action. */
export interface AuditEntry {
  id: string;
  actorUserId: string | null;
  /** Tenant the action targeted; null for platform-wide actions. */
  actingBusinessId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

export interface NewAuditEntry {
  actorUserId: string | null;
  actingBusinessId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

import type { JobStatusEnum } from "./database";
import type { TimePoint } from "@/lib/analytics/buckets";

/** One execution of a scheduled job. */
export interface JobRun {
  id: string;
  job: string;
  status: JobStatusEnum;
  startedAt: string;
  finishedAt: string;
  processed: number;
  sent: number;
  failed: number;
  error: string | null;
}

export interface NewJobRun {
  job: string;
  status: JobStatusEnum;
  startedAt: string;
  processed?: number;
  sent?: number;
  failed?: number;
  error?: string | null;
}

/** What the platform health page reports. */
export interface PlatformHealth {
  lastRun: JobRun | null;
  minutesSinceLastRun: number | null;
  cronStale: boolean;
  queued: number;
  oldestQueuedAt: string | null;
  failedMessages: number;
  /** Nightly retention purge — silent failure means unbounded growth. */
  retentionLastRun: JobRun | null;
  minutesSinceRetention: number | null;
  /** Whether the environment is configured for each capability. */
  smsConfigured: boolean;
  edgeConfigConfigured: boolean;
  cronSecretConfigured: boolean;
  domainProvisioningConfigured: boolean;
  /**
   * Live detail behind `edgeConfigConfigured`: which variable supplied the
   * connection, and whether the store actually answers. The boolean alone
   * cannot distinguish "not configured" from "configured but broken".
   */
  edgeConfig: EdgeConfigProbe;
}

/** Cross-tenant growth over time. */
export interface PlatformGrowth {
  months: number;
  businesses: TimePoint[];
  customers: TimePoint[];
  messagesSent: TimePoint[];
}

/** Cross-tenant totals for the platform dashboard. */
export interface PlatformStats {
  businesses: number;
  activeBusinesses: number;
  customers: number;
  appointments: number;
  messagesSent: number;
  messagesQueued: number;
  messagesFailed: number;
  verifiedDomains: number;
}

/** One row in the platform's business list. */
export interface PlatformBusinessSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  onboardingPercentage: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface PlatformBusinessListQuery {
  q?: string;
  page: number;
  pageSize: number;
}

export interface PlatformBusinessListResult {
  rows: PlatformBusinessSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Per-tenant counts shown on the platform's business detail page. */
export interface PlatformBusinessCounts {
  customers: number;
  appointments: number;
  messagesSent: number;
  domains: number;
}

export interface AuditListQuery {
  actingBusinessId?: string;
  actorUserId?: string;
  page: number;
  pageSize: number;
}

export interface AuditListResult {
  rows: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
