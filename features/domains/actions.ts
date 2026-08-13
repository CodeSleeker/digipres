"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { featureError } from "@/lib/features/guard";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { BusinessError } from "@/services/business-service";
import { logError } from "@/lib/observability/logger";
import { addDomainSchema } from "@/schemas/domain";
import type { BusinessDomain } from "@/types/domain";
import type { DnsInstruction } from "@/lib/domains/provider";
import { makeDomainService } from "./service";

export type DomainState = {
  success?: boolean;
  error?: string;
  /** DNS records the owner must create at their registrar. */
  instructions?: DnsInstruction[];
  verified?: boolean;
  /** Non-fatal warning (e.g. provisioning not configured). */
  notice?: string;
};

const NO_BUSINESS: DomainState = {
  error: "Create your business profile before connecting a domain.",
};

/**
 * Shown when the change was saved but the edge routing table wasn't rewritten.
 *
 * Deliberately names the consequence rather than the cause: the site still
 * works, so "failed" would overstate it, while silence understates it — the
 * canonical redirect won't happen until the table is published.
 */
const UNPUBLISHED_NOTICE =
  "Saved, but the change isn't live at the edge yet — your site still works, " +
  "but redirects to your primary domain won't happen until it is. Use " +
  "“Republish routing” below, and check /platform/health if it keeps failing.";

/** The owner's hostnames, including unverified ones. */
export async function getMyDomains(): Promise<BusinessDomain[]> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return [];
  return makeDomainService(supabase).list(businessId);
}

export async function addDomain(
  _prevState: DomainState,
  formData: FormData,
): Promise<DomainState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "custom_domains");
  if (denied) return { error: denied };

  const parsed = addDomainSchema.safeParse({
    hostname: formData.get("hostname"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid domain." };
  }

  try {
    const result = await makeDomainService(supabase).add(
      businessId,
      parsed.data.hostname,
    );
    await auditTenantAction(context, "domain.added", {
      entity: "business_domain",
      metadata: { hostname: parsed.data.hostname },
    });
    revalidatePath("/admin/domains");
    return {
      success: true,
      instructions: result.instructions,
      notice: result.providerError,
    };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

/** Re-check DNS. On success the domain starts serving (edge table republished). */
export async function verifyDomain(formData: FormData): Promise<DomainState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "custom_domains");
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing domain id." };

  try {
    const result = await makeDomainService(supabase).verify(businessId, id);
    await auditTenantAction(context, "domain.verified", {
      entity: "business_domain",
      entityId: id,
      metadata: { verified: result.verified },
    });
    revalidatePath("/admin/domains");
    return {
      success: result.verified,
      verified: result.verified,
      instructions: result.instructions,
      // Verified but not published means the edge doesn't know yet. Said out
      // loud, because the alternative is a green tick over a site that is still
      // resolving the slow way and never redirects to its canonical hostname.
      notice:
        result.verified && result.published === false
          ? UNPUBLISHED_NOTICE
          : undefined,
      error: result.verified
        ? undefined
        : (result.error ??
          "DNS isn't pointing here yet. Add the records below, then try again."),
    };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

/** Make this hostname canonical; the others 301 to it. */
export async function setPrimaryDomain(
  formData: FormData,
): Promise<DomainState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "custom_domains");
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing domain id." };

  try {
    const published = await makeDomainService(supabase).setPrimary(
      businessId,
      id,
    );
    await auditTenantAction(context, "domain.set_primary", {
      entity: "business_domain",
      entityId: id,
    });
    revalidatePath("/admin/domains");
    return {
      success: true,
      notice: published ? undefined : UNPUBLISHED_NOTICE,
    };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

/**
 * Rewrite the edge routing table from the current rows, changing no data.
 *
 * The retry for a publish that failed when it first ran — which is otherwise
 * unreachable, since every other path publishes only as a side effect of a
 * change, and the change most likely to need retrying (setting the primary
 * domain) hides its own button once it has been applied.
 */
export async function republishRouting(): Promise<DomainState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "custom_domains");
  if (denied) return { error: denied };

  try {
    const published = await makeDomainService(supabase).republishRouting();
    await auditTenantAction(context, "domain.routing_republished", {
      entity: "business_domain",
      metadata: { published },
    });
    revalidatePath("/admin/domains");
    return published
      ? { success: true, notice: "Routing republished — redirects are live." }
      : {
          error:
            "Couldn't reach the routing store. Check GLOBAL_CONFIG and " +
            "VERCEL_API_TOKEN are set on this deployment, then try again.",
        };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

export async function removeDomain(formData: FormData): Promise<DomainState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "custom_domains");
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing domain id." };

  try {
    await makeDomainService(supabase).remove(businessId, id);
    await auditTenantAction(context, "domain.removed", {
      entity: "business_domain",
      entityId: id,
    });
    revalidatePath("/admin/domains");
    return { success: true };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

function toMessage(error: unknown): string {
  if (error instanceof BusinessError) {
    switch (error.code) {
      case "INVALID_HOSTNAME":
        return "Enter a valid domain, e.g. roniesbarber.com.";
      case "NOT_FOUND":
        return "Create your business profile before connecting a domain.";
      default:
        break;
    }
  }
  // Unique index on hostname — the domain belongs to someone else.
  if ((error as { code?: string } | null)?.code === "23505") {
    return "That domain is already connected to a business.";
  }
  logError(error, { scope: "domains" });
  return "Something went wrong. Please try again.";
}
