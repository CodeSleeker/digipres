import type { HostRoute } from "./resolve";

/**
 * Database fallback for host resolution, used when Edge Config doesn't have the
 * answer (unconfigured, stale after a just-verified domain, or an outage).
 *
 * Talks to PostgREST over plain fetch so it works in the edge runtime, and
 * caches results per edge instance — including negative results — so an unknown
 * host can't turn into a query flood.
 *
 * Without this, an Edge Config outage would take every custom domain down.
 */
interface CacheEntry {
  route: HostRoute | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const HIT_TTL_MS = 60_000;
const MISS_TTL_MS = 10_000;

interface DomainRow {
  hostname: string;
  is_primary: boolean;
  businesses: { slug: string } | null;
}

export async function resolveHostFromDb(
  hostname: string,
): Promise<HostRoute | null> {
  const now = Date.now();
  const cached = cache.get(hostname);
  if (cached && cached.expires > now) return cached.route;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  let route: HostRoute | null = null;
  try {
    const endpoint =
      `${url}/rest/v1/business_domains` +
      `?hostname=eq.${encodeURIComponent(hostname)}` +
      `&verified=is.true&select=hostname,is_primary,businesses(slug)`;

    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (res.ok) {
      const rows = (await res.json()) as DomainRow[];
      const slug = rows?.[0]?.businesses?.slug;
      if (slug) {
        route = {
          slug,
          hostname: rows[0]!.hostname,
          // Degraded mode: we don't look up the tenant's canonical host here, so
          // serve this one rather than risk a wrong redirect. Canonical 301s
          // resume as soon as Edge Config is available again.
          primaryHostname: null,
          source: "domain",
        };
      }
    }
  } catch {
    route = null;
  }

  if (cache.size > 5_000) cache.clear();
  cache.set(hostname, {
    route,
    expires: now + (route ? HIT_TTL_MS : MISS_TTL_MS),
  });
  return route;
}
