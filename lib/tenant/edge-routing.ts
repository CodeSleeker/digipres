import { createClient, type EdgeConfigClient } from "@vercel/edge-config";

/**
 * Host → tenant routing table, published to Vercel Edge Config so the edge
 * middleware can resolve a custom domain with no database round-trip.
 *
 * Two maps in one key (a single read per request):
 *  - domains: every VERIFIED hostname → its tenant slug (+ whether it's canonical)
 *  - primary: slug → canonical hostname, so aliases (www, the platform
 *    subdomain, /s/<slug>) know where to 301.
 *
 * The domain admin actions are the only writer (step c).
 */
export interface TenantRouting {
  domains: Record<string, { slug: string; primary: boolean }>;
  primary: Record<string, string>;
}

export const TENANT_ROUTING_KEY = "tenantRouting";

let client: EdgeConfigClient | null = null;

/**
 * Read the routing table, or null when Edge Config isn't configured (local dev)
 * or unreachable. Callers fall back to platform-subdomain / DEV_BUSINESS_SLUG
 * resolution — a config miss must never take the site down.
 */
export async function getTenantRouting(): Promise<TenantRouting | null> {
  const connection = process.env.EDGE_CONFIG;
  if (!connection) return null;

  try {
    client ??= createClient(connection);
    return (await client.get<TenantRouting>(TENANT_ROUTING_KEY)) ?? null;
  } catch {
    return null;
  }
}
