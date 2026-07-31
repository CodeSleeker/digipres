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
/**
 * The store's connection string, under either of its names.
 *
 * Vercel renamed Edge Config to Global Config in July 2026. Connecting a store
 * now injects `GLOBAL_CONFIG`; stores connected before that still supply
 * `EDGE_CONFIG`. Reading both means neither an existing deployment nor a
 * freshly connected store silently resolves to "not configured" — which, since
 * a missing table falls back to the database rather than erroring, would look
 * like nothing at all was wrong.
 */
export function edgeConfigConnection(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  return env.GLOBAL_CONFIG?.trim() || env.EDGE_CONFIG?.trim() || undefined;
}

/**
 * The store's id (`ecfg_…`), which the WRITE path needs — reads use the
 * connection string, writes go through the Vercel REST API by id.
 *
 * Vercel never injects an id variable; only the connection string is set
 * automatically. But the id is the path segment of that string, so it is
 * derived here rather than asked for a second time. An explicit
 * GLOBAL_CONFIG_ID / EDGE_CONFIG_ID still wins, for a store reached through a
 * URL this can't parse.
 *
 * Deriving it removes a whole class of silent failure: publishing is
 * best-effort and returns false rather than throwing, so a mistyped or
 * forgotten id meant domains verified fine while the routing table was never
 * updated, with nothing to show for it.
 */
export function edgeConfigStoreId(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const explicit =
    env.GLOBAL_CONFIG_ID?.trim() || env.EDGE_CONFIG_ID?.trim() || undefined;
  if (explicit) return explicit;

  const connection = edgeConfigConnection(env);
  if (!connection) return undefined;

  try {
    // https://edge-config.vercel.com/ecfg_abc123?token=… → "ecfg_abc123"
    const segments = new URL(connection).pathname.split("/").filter(Boolean);
    return segments.at(-1) || undefined;
  } catch {
    // Not a URL — nothing to derive, and the explicit variable is the fix.
    return undefined;
  }
}

export async function getTenantRouting(): Promise<TenantRouting | null> {
  const connection = edgeConfigConnection();
  if (!connection) return null;

  try {
    client ??= createClient(connection);
    return (await client.get<TenantRouting>(TENANT_ROUTING_KEY)) ?? null;
  } catch {
    return null;
  }
}
