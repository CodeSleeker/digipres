import {
  UnconfiguredDomainProvider,
  vercelDnsFor,
  type DnsInstruction,
  type DomainProvider,
  type DomainProvisionResult,
} from "./provider";

const API = "https://api.vercel.com";

interface VercelDomainBody {
  verified?: boolean;
  verification?: { type: string; domain: string; value: string }[];
  error?: { code?: string; message?: string };
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/** `?teamId=…` when the project lives under a Vercel team. */
function scope(prefix: "?" | "&" = "?"): string {
  const team = process.env.VERCEL_TEAM_ID?.trim();
  return team ? `${prefix}teamId=${encodeURIComponent(team)}` : "";
}

/** Vercel's own challenge records take precedence over our pointing hint. */
function instructionsFrom(
  hostname: string,
  body: VercelDomainBody,
): DnsInstruction[] {
  const challenges = (body.verification ?? []).map((v) => ({
    type: v.type.toUpperCase() as DnsInstruction["type"],
    name: v.domain,
    value: v.value,
  }));
  return [...vercelDnsFor(hostname), ...challenges];
}

/**
 * Registers custom hostnames with the Vercel project so Vercel routes them here
 * and issues the TLS certificate. Requires VERCEL_API_TOKEN + VERCEL_PROJECT_ID
 * (+ VERCEL_TEAM_ID on a team).
 */
export class VercelDomainProvider implements DomainProvider {
  readonly name = "vercel";

  constructor(private readonly projectId: string) {}

  async add(hostname: string): Promise<DomainProvisionResult> {
    return this.call(
      `${API}/v10/projects/${this.projectId}/domains${scope()}`,
      { method: "POST", headers: headers(), body: JSON.stringify({ name: hostname }) },
      hostname,
      // Re-adding an existing domain is a success for our purposes.
      ["domain_already_exists"],
    );
  }

  async status(hostname: string): Promise<DomainProvisionResult> {
    return this.call(
      `${API}/v9/projects/${this.projectId}/domains/${hostname}${scope()}`,
      { method: "GET", headers: headers() },
      hostname,
    );
  }

  async verify(hostname: string): Promise<DomainProvisionResult> {
    return this.call(
      `${API}/v9/projects/${this.projectId}/domains/${hostname}/verify${scope()}`,
      { method: "POST", headers: headers() },
      hostname,
    );
  }

  async remove(hostname: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(
        `${API}/v9/projects/${this.projectId}/domains/${hostname}${scope()}`,
        { method: "DELETE", headers: headers() },
      );
      if (res.ok || res.status === 404) return { ok: true };
      const body = (await res.json().catch(() => ({}))) as VercelDomainBody;
      return { ok: false, error: body.error?.message ?? `Vercel ${res.status}` };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Vercel request failed",
      };
    }
  }

  private async call(
    url: string,
    init: RequestInit,
    hostname: string,
    tolerate: string[] = [],
  ): Promise<DomainProvisionResult> {
    try {
      const res = await fetch(url, init);
      const body = (await res.json().catch(() => ({}))) as VercelDomainBody;

      if (!res.ok && !tolerate.includes(body.error?.code ?? "")) {
        return {
          ok: false,
          verified: false,
          instructions: instructionsFrom(hostname, body),
          error: body.error?.message ?? `Vercel error ${res.status}`,
        };
      }

      return {
        ok: true,
        verified: Boolean(body.verified),
        instructions: instructionsFrom(hostname, body),
      };
    } catch (error) {
      return {
        ok: false,
        verified: false,
        instructions: vercelDnsFor(hostname),
        error:
          error instanceof Error ? error.message : "Vercel request failed",
      };
    }
  }
}

/** Vercel provider when credentials exist, otherwise an explicit no-op. */
export function getDomainProvider(): DomainProvider {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  return token && projectId
    ? new VercelDomainProvider(projectId)
    : new UnconfiguredDomainProvider();
}
