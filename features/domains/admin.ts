import { createServiceClient } from "@/lib/supabase/service";
import { DomainRepository } from "@/repositories/domain-repository";
import { publishTenantRouting } from "@/lib/domains/edge-config";
import { logError } from "@/lib/observability/logger";
import type { DomainAdminPort } from "@/services/domain-service";

/**
 * The trusted half of domain management.
 *
 * Uses the service-role client because owners are blocked (by column-level
 * grants in migration 0010) from writing `verified` — that flip may only happen
 * after the provider confirms DNS. Publishing the edge routing table is the
 * other privileged write.
 */
export function makeDomainAdmin(): DomainAdminPort {
  return {
    async markVerified(domainId: string): Promise<void> {
      const supabase = createServiceClient();
      await new DomainRepository(supabase).markVerified(domainId);
    },

    async publishRouting(): Promise<boolean> {
      try {
        const supabase = createServiceClient();
        const routes = await new DomainRepository(supabase).listVerifiedRoutes();
        return await publishTenantRouting(routes);
      } catch (error) {
        // Never fail the owner's action because the edge sync hiccuped — the
        // table can be republished on the next domain change.
        logError(error, { scope: "domains:publishRouting" });
        return false;
      }
    },
  };
}
