"use server";

import { revalidatePath } from "next/cache";
import { FIELDS } from "./form-fields";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Business } from "@/types/business-entity";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import {
  revalidateOwnerSite,
  revalidateTenantSite,
} from "@/lib/tenant/revalidate";
import { BusinessRepository } from "@/repositories/business-repository";
import { isShortMapLink, parseCoordinates } from "@/lib/geo/coordinates";
import { BusinessError, BusinessService } from "@/services/business-service";
import {
  createBusinessSchema,
  lodgingDetailsSchema,
  updateBusinessSchema,
} from "@/schemas/business";

/**
 * Server Actions for the Business entity — the thin boundary the (future)
 * dashboard UI calls. Each action: resolves the authenticated user, validates
 * input with Zod, delegates rules to the service, revalidates, and returns a
 * typed result. Internal errors are never surfaced to the client.
 */

export type BusinessFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function makeService(supabase: SupabaseClient<Database>): BusinessService {
  return new BusinessService(new BusinessRepository(supabase));
}

// ── Read ───────────────────────────────────────────────────────────────────

/** The acting tenant's business (or null) — the client's under impersonation. */
export async function getMyBusiness(): Promise<Business | null> {
  return (await getOwnerContext()).business;
}

// ── Create (owner self-service only) ─────────────────────────────────────────

export async function createBusiness(
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const { supabase, user, isImpersonating } = await getOwnerContext();
  // A client you can impersonate already has a business; creating a NEW client
  // is the platform onboarding flow. Keep create out of the impersonated session
  // so it can never run against the staff member's own account by accident.
  if (isImpersonating) {
    return {
      error: "Creating a business isn't available while acting as a client.",
    };
  }

  const parsed = createBusinessSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  try {
    await makeService(supabase).createForOwner(user.id, parsed.data);
  } catch (error) {
    return { error: toMessage(error) };
  }

  revalidatePath("/admin");
  await revalidateOwnerSite(supabase, user.id);
  return { success: true };
}

// ── Update (business-scoped) ─────────────────────────────────────────────────

export async function updateBusiness(
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId, business } = context;
  if (!businessId || !business) {
    return { error: "Create your business profile first." };
  }

  /*
   * The map pin arrives as something an owner can actually get: a pasted
   * Google Maps link, or a "lat, lng" pair. Resolved before validation so a
   * link that carries no coordinate gets a message about the link, rather than
   * a "must be a number" error on a field the form never showed.
   */
  const location = resolveMapLocation(formData);
  if ("error" in location) {
    return { fieldErrors: { mapLocation: [location.error] } };
  }

  const parsed = updateBusinessSchema.safeParse({
    ...readForm(formData),
    ...location.values,
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  try {
    await makeService(supabase).updateById(businessId, parsed.data);
    await auditTenantAction(context, "business.updated", {
      entity: "business",
      entityId: businessId,
      metadata: { fields: Object.keys(parsed.data) },
    });
  } catch (error) {
    return { error: toMessage(error) };
  }

  revalidatePath("/admin");
  // Revalidate the acting tenant's public site — the old slug, and the new one
  // if it changed (name/slug/desc feed the public site).
  revalidateTenantSite(business.slug);
  if (parsed.data.slug && parsed.data.slug !== business.slug) {
    revalidateTenantSite(parsed.data.slug);
  }
  return { success: true };
}

/**
 * The lodging facts — check-in, bedrooms, pets, amenities.
 *
 * Separate from `updateBusiness` because it writes one JSONB document rather
 * than a set of columns, and because it is offered only to a lodging tenant.
 * The CATEGORY IS CHECKED HERE, not just in the page that renders the form:
 * hiding a form does not stop a crafted POST, and publishing `checkinTime` on a
 * barber's structured data would be markup that misdescribes the business.
 */
export async function updateLodgingDetails(
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId, business } = context;
  if (!businessId || !business) {
    return { error: "Create your business profile first." };
  }
  if (business.category !== "lodging") {
    return { error: "These details only apply to places to stay." };
  }

  const parsed = lodgingDetailsSchema.safeParse({
    checkInTime: formData.get("checkInTime"),
    checkOutTime: formData.get("checkOutTime"),
    bedrooms: formData.get("bedrooms"),
    maxGuests: formData.get("maxGuests"),
    petsAllowed: formData.get("petsAllowed"),
    // One per line, like the other string lists in the CMS.
    amenities: (formData.get("amenities")?.toString() ?? "").split("\n"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { petsAllowed, ...rest } = parsed.data;
  try {
    await new BusinessRepository(supabase).updateLodgingDetails(businessId, {
      ...rest,
      checkInTime: rest.checkInTime ?? undefined,
      checkOutTime: rest.checkOutTime ?? undefined,
      bedrooms: rest.bedrooms ?? undefined,
      maxGuests: rest.maxGuests ?? undefined,
      // The tri-state survives the round trip: "yes"/"no" become a boolean,
      // and "not said" stays absent rather than becoming false.
      ...(petsAllowed ? { petsAllowed: petsAllowed === "yes" } : {}),
    });
    await auditTenantAction(context, "business.lodging_updated", {
      entity: "business",
      entityId: businessId,
    });
  } catch (error) {
    return { error: toMessage(error) };
  }

  revalidatePath("/admin/settings");
  revalidateTenantSite(business.slug);
  return { success: true };
}

// ── Delete (soft, owner only) ────────────────────────────────────────────────

export async function deleteBusiness(): Promise<BusinessFormState> {
  const { supabase, businessId, business, isImpersonating } =
    await getOwnerContext();
  // Deleting a client's account is a super_admin action in the platform portal,
  // not a "help the client" operation — keep it out of the impersonated session.
  if (isImpersonating) {
    return {
      error: "Deleting a business isn't available while acting as a client.",
    };
  }
  if (!businessId || !business)
    return { error: "No business found to delete." };

  try {
    await makeService(supabase).deleteById(businessId);
    revalidatePath(`/s/${business.slug}`);
  } catch (error) {
    return { error: toMessage(error) };
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// ── Helpers ──────────────────────────────────────────────────────────────────


/**
 * Build a raw input object from FormData. Only keys actually present are
 * included, so update stays a genuine partial (omitted fields are untouched).
 * `hours` and `brand` arrive as JSON string fields.
 */
/**
 * Turn the pasted map location into the two columns.
 *
 * Three outcomes, all of them meaningful:
 *   field absent   — this form didn't offer it; leave the stored pin alone.
 *   field blank    — the owner cleared it; both columns go null TOGETHER,
 *                    because the constraint refuses a half-filled point.
 *   field filled   — parse it, or explain why it couldn't be.
 */
function resolveMapLocation(
  formData: FormData,
): { values: Record<string, unknown> } | { error: string } {
  if (!formData.has("mapLocation")) return { values: {} };

  const raw = (formData.get("mapLocation")?.toString() ?? "").trim();
  if (!raw) return { values: { latitude: null, longitude: null } };

  const point = parseCoordinates(raw);
  if (point) {
    return { values: { latitude: point.latitude, longitude: point.longitude } };
  }

  // A short link is the common failure and has its own instruction: it holds
  // no coordinate at all, so no amount of parsing will help.
  return {
    error: isShortMapLink(raw)
      ? "Short links don't carry the coordinates. Open the link, then copy the full address-bar URL and paste that."
      : "We couldn't find coordinates in that. Paste the URL from your browser's address bar with the place open on Google Maps, or type the latitude and longitude separated by a comma.",
  };
}

function readForm(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of FIELDS) {
    if (formData.has(key)) {
      const value = formData.get(key);
      raw[key] = typeof value === "string" ? value : undefined;
    }
  }
  if (formData.has("hours")) {
    const value = formData.get("hours");
    if (typeof value === "string" && value.trim() !== "") {
      try {
        raw.hours = JSON.parse(value);
      } catch {
        raw.hours = value; // let Zod reject invalid JSON
      }
    }
  }
  // Unlike `hours`, an empty `brand` is meaningful: it drops the override so
  // the wordmark reverts to being derived from the business name.
  if (formData.has("brand")) {
    const value = formData.get("brand");
    if (typeof value !== "string" || value.trim() === "") {
      raw.brand = null;
    } else {
      try {
        raw.brand = JSON.parse(value);
      } catch {
        raw.brand = value; // let Zod reject invalid JSON
      }
    }
  }
  return raw;
}

function fieldErrorsOf(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  const flat = error.flatten().fieldErrors;
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages && messages.length) out[key] = messages;
  }
  return out;
}

function toMessage(error: unknown): string {
  if (error instanceof BusinessError) {
    switch (error.code) {
      case "ALREADY_EXISTS":
        return "You already have a business — only one per account is allowed.";
      case "SLUG_TAKEN":
        return "That slug is already taken. Please choose another.";
      case "NOT_FOUND":
        return "No business found to update.";
    }
  }
  // Log server-side, return a safe generic message to the client.
  console.error("[business action]", error);
  return "Something went wrong. Please try again.";
}
