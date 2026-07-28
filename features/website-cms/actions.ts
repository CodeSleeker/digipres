"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Business } from "@/types/business-entity";
import type { WebsiteSection } from "@/types/website-content";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { BusinessRepository } from "@/repositories/business-repository";
import { revalidateTenantSite } from "@/lib/tenant/revalidate";
import { WebsiteContentService } from "@/services/website-content-service";
import { BusinessError } from "@/services/business-service";
import { SECTION_SCHEMA } from "@/schemas/website-content";

/**
 * Server Actions for the Website CMS. The client form serializes its section
 * values to a JSON `content` field; the action re-validates with the section's
 * Zod schema (never trusting the client), delegates to the service, then
 * revalidates BOTH the public site and this CMS page so edits appear at once.
 */

export type CmsFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function makeService(
  supabase: SupabaseClient<Database>,
): WebsiteContentService {
  return new WebsiteContentService(new BusinessRepository(supabase));
}

/** The owner's business (with content) for prefilling the CMS forms. */
export async function getMyWebsite(): Promise<Business | null> {
  const { business } = await getOwnerContext();
  return business;
}

async function saveSection(
  section: WebsiteSection,
  formData: FormData,
): Promise<CmsFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) {
    return {
      error: "Create your business profile before editing the website.",
    };
  }

  const raw = formData.get("content");
  let json: unknown;
  try {
    json = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    return { error: "Could not read the submitted content." };
  }

  const parsed = SECTION_SCHEMA[section].safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(
      parsed.error.flatten().fieldErrors,
    )) {
      if (messages && messages.length) fieldErrors[key] = messages;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    await makeService(supabase).updateSection(businessId, section, parsed.data);
    await auditTenantAction(context, "website.section_updated", {
      entity: "business",
      entityId: businessId,
      metadata: { section },
    });
  } catch (error) {
    return { error: toMessage(error) };
  }

  revalidateTenantSite(context.business?.slug ?? null); // the tenant being edited
  revalidatePath(`/admin/website/${section}`); // this CMS page
  return { success: true };
}

// One thin exported action per section (a "use server" file may only export
// async functions).
export async function saveHero(formData: FormData) {
  return saveSection("hero", formData);
}
export async function saveAbout(formData: FormData) {
  return saveSection("about", formData);
}
export async function saveServices(formData: FormData) {
  return saveSection("services", formData);
}
export async function saveGallery(formData: FormData) {
  return saveSection("gallery", formData);
}
export async function saveContact(formData: FormData) {
  return saveSection("contact", formData);
}
export async function saveFooter(formData: FormData) {
  return saveSection("footer", formData);
}

function toMessage(error: unknown): string {
  if (error instanceof BusinessError && error.code === "NOT_FOUND") {
    return "Create your business profile before editing the website.";
  }
  console.error("[website-cms]", error);
  return "Something went wrong. Please try again.";
}
