import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { DomainRepository } from "@/repositories/domain-repository";
import { DomainService } from "@/services/domain-service";
import { getDomainProvider } from "@/lib/domains/vercel";
import { makeDomainAdmin } from "./admin";

/**
 * Wire a DomainService for a request: owner-scoped repositories (RLS applies),
 * the configured edge provider, and the service-role admin port.
 */
export function makeDomainService(
  supabase: SupabaseClient<Database>,
): DomainService {
  return new DomainService(
    new DomainRepository(supabase),
    getDomainProvider(),
    makeDomainAdmin(),
  );
}
