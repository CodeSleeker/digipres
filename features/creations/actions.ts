"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { CreationRepository } from "@/repositories/subscriber-repository";
import { creationSchema } from "@/schemas/subscriber";
import { logError } from "@/lib/observability/logger";

/**
 * The owner writing up what they have made.
 *
 * These rows are the ONLY thing that triggers a weekly digest, so creating one
 * is closer to scheduling a send than to editing a page. That is why the form
 * says so plainly and why `publishedAt` is editable: it is the date the digest
 * windows on, so an owner can write something up early, or add last week's bake
 * without it going out as news.
 */

export type CreationFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function readInput(formData: FormData) {
  return creationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    price: formData.get("price"),
    publishedAt: formData.get("publishedAt"),
  });
}

function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (!key) continue;
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export async function createCreation(
  _prev: CreationFormState,
  formData: FormData,
): Promise<CreationFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) {
    return { error: "Create your business profile before adding anything." };
  }

  const parsed = readInput(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  try {
    const created = await new CreationRepository(supabase).create(businessId, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      price: parsed.data.price ?? null,
      publishedAt: parsed.data.publishedAt,
    });
    await auditTenantAction(context, "creation.created", {
      entity: "creation",
      entityId: created.id,
      metadata: { name: created.name },
    });
  } catch (error) {
    logError(error, { scope: "creations:create" });
    return { error: "Could not save that. Please try again." };
  }

  revalidatePath("/admin/creations");
  redirect("/admin/creations");
}

export async function updateCreation(
  _prev: CreationFormState,
  formData: FormData,
): Promise<CreationFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return { error: "No business found." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nothing to update." };

  const parsed = readInput(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  try {
    await new CreationRepository(supabase).update(businessId, id, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      price: parsed.data.price ?? null,
      publishedAt: parsed.data.publishedAt,
    });
    await auditTenantAction(context, "creation.updated", {
      entity: "creation",
      entityId: id,
      metadata: { name: parsed.data.name },
    });
  } catch (error) {
    logError(error, { scope: "creations:update" });
    return { error: "Could not save that. Please try again." };
  }

  revalidatePath("/admin/creations");
  redirect("/admin/creations");
}

/**
 * Soft delete.
 *
 * The row stays because a creation already announced in a digest must not
 * vanish from the record of what was sent — and because the digest's own
 * idempotency is a window over published dates, not a snapshot.
 */
export async function deleteCreation(formData: FormData): Promise<void> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  const id = String(formData.get("id") ?? "");
  if (!businessId || !id) redirect("/admin/creations");

  try {
    await new CreationRepository(supabase).softDelete(businessId, id);
    await auditTenantAction(context, "creation.deleted", {
      entity: "creation",
      entityId: id,
    });
  } catch (error) {
    logError(error, { scope: "creations:delete" });
  }

  revalidatePath("/admin/creations");
  redirect("/admin/creations");
}
