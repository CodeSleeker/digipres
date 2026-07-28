"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformWriter } from "@/lib/auth/require-platform-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { AuditRepository } from "@/repositories/audit-repository";
import { onboardBusinessSchema } from "@/schemas/platform-onboarding";
import { siteBaseUrl } from "@/lib/tenant/urls";
import { slugify } from "@/lib/slug";
import { logError } from "@/lib/observability/logger";

export type OnboardState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  businessId?: string;
  slug?: string;
};

/**
 * Onboard a new client: invite the owner, create their business, and record it.
 *
 * Runs with the SERVICE-ROLE client because both writes are cross-tenant by
 * nature — platform staff are creating an auth user and a business owned by
 * someone else, which RLS (correctly) forbids for a normal session. That makes
 * this one of the few trusted paths in the codebase, so it is:
 *   - guarded by requirePlatformWriter() before anything happens,
 *   - written to the audit log, and
 *   - rolled back (invited user deleted) if the business insert fails, so a
 *     failure can't leave an orphaned account.
 *
 * The owner receives an INVITE link, never a password — they set their own via
 * the existing /auth/callback → /reset-password flow.
 */
export async function onboardBusiness(
  _prevState: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const { supabase, user, role } = await requirePlatformWriter();

  const parsed = onboardBusinessSchema.safeParse({
    businessName: formData.get("businessName"),
    ownerEmail: formData.get("ownerEmail"),
    slug: formData.get("slug"),
    templateCode: formData.get("templateCode"),
    themeCode: formData.get("themeCode"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(
      parsed.error.flatten().fieldErrors,
    )) {
      if (messages?.length) fieldErrors[key] = messages;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;

  let admin: ReturnType<typeof createServiceClient>;
  try {
    admin = createServiceClient();
  } catch {
    return {
      error:
        "Onboarding is not configured on this environment (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  // 1. Invite the owner — they set their own password.
  const invite = await admin.auth.admin.inviteUserByEmail(input.ownerEmail, {
    redirectTo: `${siteBaseUrl()}/auth/callback?next=/reset-password`,
  });
  if (invite.error || !invite.data?.user) {
    return {
      error:
        invite.error?.message ??
        "Could not invite that email address. It may already have an account.",
    };
  }
  const ownerId = invite.data.user.id;

  // 2. Create the business under a unique slug.
  try {
    const slug = await uniqueSlug(admin, input.slug ?? slugify(input.businessName));

    const { data, error } = await admin
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: input.businessName,
        slug,
        template_code: input.templateCode,
        theme_code: input.themeCode,
        status: "draft",
      })
      .select("id,slug")
      .single();
    if (error) throw error;

    // 3. Record who did this, against which tenant.
    await new AuditRepository(supabase).record({
      actorUserId: user.id,
      actingBusinessId: data.id,
      action: "business.onboarded",
      entity: "business",
      entityId: data.id,
      metadata: {
        ownerEmail: input.ownerEmail,
        templateCode: input.templateCode,
        themeCode: input.themeCode,
        actorRole: role,
      },
    });

    revalidatePath("/platform/businesses");
    return { success: true, businessId: data.id, slug: data.slug };
  } catch (error) {
    // Roll back the invite so a failure doesn't strand an orphan account.
    await admin.auth.admin.deleteUser(ownerId).catch(() => {});
    logError(error, { scope: "platform:onboardBusiness" });

    if ((error as { code?: string } | null)?.code === "23505") {
      return { error: "That slug is already taken. Choose another." };
    }
    return { error: "Could not create the business. Please try again." };
  }
}

/** Append -2, -3, … until the slug is free. Uses the service client (all tenants). */
async function uniqueSlug(
  admin: ReturnType<typeof createServiceClient>,
  base: string,
): Promise<string> {
  const root = base || "business";
  let candidate = root;
  let n = 2;

  for (;;) {
    const { data, error } = await admin
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${root}-${n++}`;
  }
}
