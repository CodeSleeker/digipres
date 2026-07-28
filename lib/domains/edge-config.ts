import type { DomainRoute } from "@/types/domain";
import {
  TENANT_ROUTING_KEY,
  type TenantRouting,
} from "@/lib/tenant/edge-routing";

/**
 * Publishes the hostname → tenant routing table to Vercel Edge Config, which is
 * what the edge middleware reads (lib/tenant/edge-routing.ts).
 *
 * Reads use the EDGE_CONFIG connection string; WRITES go through the Vercel API
 * and need EDGE_CONFIG_ID + VERCEL_API_TOKEN.
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
 * Upsert the routing table. No-ops when Edge Config writing isn't configured
 * (local dev) — resolution then falls back to platform subdomains.
 * Returns false when it couldn't publish, so callers can warn.
 */
export async function publishTenantRouting(
  routes: DomainRoute[],
): Promise<boolean> {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const configId = process.env.EDGE_CONFIG_ID?.trim();
  if (!token || !configId) return false;

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
    return res.ok;
  } catch {
    return false;
  }
}
