import type { DomainRoute } from "@/types/domain";
import {
  TENANT_ROUTING_KEY,
  edgeConfigStoreId,
  type TenantRouting,
} from "@/lib/tenant/edge-routing";

/**
 * Publishes the hostname → tenant routing table to Vercel Global Config (named
 * Edge Config before July 2026), which the edge middleware reads
 * (lib/tenant/edge-routing.ts).
 *
 * Reads use the GLOBAL_CONFIG connection string; WRITES go through the Vercel
 * API and additionally need VERCEL_API_TOKEN. The store id is derived from the
 * connection string, so only the token has to be supplied separately.
 */

/** Pure: fold verified routes into the two lookup maps the edge needs. */
export function buildRoutingTable(routes: DomainRoute[]): TenantRouting {
  const domains: TenantRouting["domains"] = {};
  const primary: TenantRouting["primary"] = {};

  for (const route of routes) {
    domains[route.hostname] = { slug: route.slug, primary: route.isPrimary };
    if (route.isPrimary) primary[route.slug] = route.hostname;
  }

  return { domains, primary };
}

/**
 * Why a publish didn't happen, or `ok` when it did.
 *
 * A boolean was not enough. Every distinct cause — no token, an unparseable
 * connection string, a store owned by a team the token can't see, a 403 —
 * collapsed into `false`, and the only thing the UI could do with that was
 * guess out loud. The guess named the two variables most likely to be missing,
 * which is unhelpful precisely when they are both set.
 */
export type PublishResult = { ok: true } | { ok: false; reason: string };

/**
 * Upsert the routing table. No-ops when the store isn't configured (local dev)
 * — resolution then falls back to platform subdomains.
 */
export async function publishTenantRouting(
  routes: DomainRoute[],
): Promise<PublishResult> {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  if (!token) {
    return { ok: false, reason: "VERCEL_API_TOKEN isn't set on this deployment." };
  }

  const configId = edgeConfigStoreId();
  if (!configId) {
    return {
      ok: false,
      reason:
        "Couldn't work out the config store id. GLOBAL_CONFIG is either unset " +
        "here or isn't a URL we can read an id from — set GLOBAL_CONFIG_ID to " +
        "the store id (ecfg_…) explicitly.",
    };
  }

  const team = process.env.VERCEL_TEAM_ID?.trim();
  const query = team ? `?teamId=${encodeURIComponent(team)}` : "";

  try {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${configId}/items${query}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              operation: "upsert",
              key: TENANT_ROUTING_KEY,
              value: buildRoutingTable(routes),
            },
          ],
        }),
      },
    );
    if (res.ok) return { ok: true };

    /*
     * Vercel's body usually names the real problem, and the status alone is
     * ambiguous in the two ways that actually happen: 403 for a token without
     * Edge Config scope, and 404 for a store that exists but belongs to a team
     * the request wasn't scoped to (VERCEL_TEAM_ID unset). Both look identical
     * from here without it.
     */
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    const teamHint =
      (res.status === 404 || res.status === 403) && !team
        ? " If the store belongs to a team, set VERCEL_TEAM_ID."
        : "";
    return {
      ok: false,
      reason: `Vercel refused the write (${res.status}). ${detail}${teamHint}`.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? `Couldn't reach Vercel: ${error.message}`
          : "Couldn't reach Vercel.",
    };
  }
}
