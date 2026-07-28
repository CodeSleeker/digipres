/**
 * What should the apex `/` route render?
 *
 * - "tenant"  — the DEV_BUSINESS_SLUG tenant preview. Local development only:
 *   the skill mandates that production never sets DEV_BUSINESS_SLUG.
 * - "landing" — the Aliamz Digital marketing page. This is what production
 *   serves at the platform apex (e.g. https://platform.com/).
 *
 * Tenant traffic never reaches this decision: subdomains and custom domains are
 * rewritten to /s/<slug> by the middleware before the apex route runs, and
 * /s/<slug> works everywhere regardless.
 */
export type ApexMode = "tenant" | "landing";

export function apexMode(env: Record<string, string | undefined>): ApexMode {
  return env.DEV_BUSINESS_SLUG?.trim() ? "tenant" : "landing";
}
