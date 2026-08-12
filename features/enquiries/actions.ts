"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { EnquiryRepository } from "@/repositories/enquiry-repository";

export type EnquiryActionState = { error?: string };

/**
 * Server Actions for the enquiry inbox.
 *
 * Both take the enquiry id from the form and the BUSINESS from the session —
 * never from the request. The repository scopes every write to that business id
 * as well, so a crafted id belonging to another tenant matches no row. RLS is
 * the third layer saying the same thing.
 */

const NO_BUSINESS: EnquiryActionState = {
  error: "Create your business profile first.",
};

function idFrom(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && id.trim() ? id : null;
}

export async function markEnquiryRead(
  formData: FormData,
): Promise<EnquiryActionState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const id = idFrom(formData);
  if (!id) return { error: "Missing enquiry." };

  try {
    await new EnquiryRepository(supabase).markRead(businessId, id);
  } catch (error) {
    console.error("[enquiries:read]", error);
    return { error: "Could not update that enquiry." };
  }

  revalidatePath("/admin/enquiries");
  // The sidebar badge lives in the layout, which /admin renders too.
  revalidatePath("/admin");
  return {};
}

export async function deleteEnquiry(
  formData: FormData,
): Promise<EnquiryActionState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const id = idFrom(formData);
  if (!id) return { error: "Missing enquiry." };

  try {
    await new EnquiryRepository(supabase).remove(businessId, id);
    // Audited, unlike marking read: this one removes a customer's words from
    // the owner's view, and the row it soft-deletes is the only record that the
    // question was ever asked.
    await auditTenantAction(context, "enquiry.deleted", {
      entity: "enquiry",
      entityId: id,
    });
  } catch (error) {
    console.error("[enquiries:delete]", error);
    return { error: "Could not remove that enquiry." };
  }

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
  return {};
}
