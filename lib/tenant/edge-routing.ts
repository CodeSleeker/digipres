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

/** Which variable actually supplied the connection string. */
export function edgeConfigSource(
  env: Record<string, string | undefined> = process.env,
): "GLOBAL_CONFIG" | "EDGE_CONFIG" | null {
  if (env.GLOBAL_CONFIG?.trim()) return "GLOBAL_CONFIG";
  if (env.EDGE_CONFIG?.trim()) return "EDGE_CONFIG";
  return null;
}

export interface EdgeConfigProbe {
  /** The variable the connection string came from, or null if neither is set. */
  source: "GLOBAL_CONFIG" | "EDGE_CONFIG" | null;
  /** Store id used by the WRITE path — derived from the URL unless set explicitly. */
  storeId: string | null;
  /** Live read result. null when there is nothing to read. */
  reachable: boolean | null;
  /** Verified hostnames currently published in the table. */
  domainCount: number | null;
  /** Why the read failed, safe to display (never contains the token). */
  error: string | null;
}

/**
 * Does the store actually answer — as opposed to "is a variable non-empty".
 *
 * The boolean this replaces on the health page could not tell those apart, so a
 * connected-but-broken store (wrong token, deleted store, or a deployment that
 * predates the variable being added) reported exactly the same as a working one.
 * Since a routing miss falls back to the database rather than erroring, nothing
 * else in the product would have shown a difference either.
 *
 * Best-effort and never throws: this is a diagnostic, and it must not be able to
 * take the health page down.
 */
export async function probeEdgeConfig(): Promise<EdgeConfigProbe> {
  const source = edgeConfigSource();
  const storeId = edgeConfigStoreId() ?? null;
  const connection = edgeConfigConnection();

  if (!connection) {
    return {
      source: null,
      storeId,
      reachable: null,
      domainCount: null,
      error: null,
    };
  }

  try {
    // A dedicated client: reusing the module-level one would cache a failure
    // from a previous request for the lifetime of the server process.
    const probe = createClient(connection);
    const table = await probe.get<TenantRouting>(TENANT_ROUTING_KEY);
    return {
      source,
      storeId,
      reachable: true,
      domainCount: Object.keys(table?.domains ?? {}).length,
      error: null,
    };
  } catch (error) {
    return {
      source,
      storeId,
      reachable: false,
      domainCount: null,
      // Message only. The connection string carries a token and must never
      // reach a rendered page, even one behind the super admin guard.
      error: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
    };
  }
}
