"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  requirePlatformWriter,
  requireSuperAdmin,
} from "@/lib/auth/require-platform-admin";
import { BusinessRepository } from "@/repositories/business-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidateTenantSite } from "@/lib/tenant/revalidate";
import { siteBaseUrl } from "@/lib/tenant/urls";
import { logError } from "@/lib/observability/logger";
import { updateBusinessSchema } from "@/schemas/business";
import type { PlatformRole } from "@/types/platform";

/**
 * Staff editing a client's details from the portal, without impersonating them.
 *
 * The business name was previously reachable only through the client's Google
 * Profile wizard — so fixing a typo meant opening a 30-minute "act as" session
 * and walking into step 1 of a flow that has nothing to do with naming.
 *
 * SLUG IS DELIBERATELY NOT EDITABLE HERE. It is the tenant's public address:
 * changing it moves the live site, breaks every link already shared, and
 * invalidates the old cache. That deserves its own flow with a confirmation.
 *
 * WHY SERVICE-ROLE: the only UPDATE policy on `businesses` is owner-scoped, and
 * migration 0012 gave platform staff SELECT only — a staff-client UPDATE would
 * match zero rows and succeed silently. The `require*` guards are the
 * authorization. Same reasoning as features/platform/lifecycle.ts.
 *
 * SHAPE OF EVERY ACTION HERE: the work happens in a helper that RETURNS an error
 * message and never redirects, and the redirect happens outside it. `redirect()`
 * throws, so calling it inside a try/catch would have the catch swallow it and
 * report a generic failure for something that actually succeeded.
 */
function fail(businessId: string, message: string): never {
  redirect(
    `/platform/businesses/${businessId}?detailsError=${encodeURIComponent(message)}`,
  );
}

function readBusinessId(formData: FormData): string {
  const businessId = String(formData.get("businessId") ?? "");
  if (!businessId) redirect("/platform/businesses");
  return businessId;
}

// ── Business name ───────────────────────────────────────────────────────────

export async function updateBusinessDetails(formData: FormData): Promise<void> {
  const { user, role } = await requirePlatformWriter();
  const businessId = readBusinessId(formData);

  // Reuse the tenant-facing rules so a name valid here is valid there.
  const parsed = updateBusinessSchema
    .pick({ name: true })
    .safeParse({ name: formData.get("name") });
  if (!parsed.success || !parsed.data.name) {
    fail(businessId, parsed.error?.issues[0]?.message ?? "Enter a name.");
  }

  const result = await applyName(businessId, parsed.data.name, user.id, role);
  if (result.error) fail(businessId, result.error);

  revalidatePath(`/platform/businesses/${businessId}`);
  // The name is on the public site — the header wordmark, the SEO title and the
  // JSON-LD all derive from it, so the tenant's cache has to go too.
  revalidateTenantSite(result.slug);
}

async function applyName(
  businessId: string,
  name: string,
  actorUserId: string,
  actorRole: PlatformRole,
): Promise<{ error?: string; slug: string | null }> {
  try {
    const admin = createServiceClient();
    const repo = new BusinessRepository(admin);

    const existing = await repo.findById(businessId);
    if (!existing) return { error: "That business no longer exists.", slug: null };

    await repo.update(businessId, { name });
    await new AuditRepository(admin).record({
      actorUserId,
      actingBusinessId: businessId,
      action: "business.updated",
      entity: "business",
      entityId: businessId,
      metadata: { field: "name", from: existing.name, to: name, actorRole },
    });

    return { slug: existing.slug };
  } catch (error) {
    logError(error, { scope: "platform:updateBusinessDetails" });
    return { error: "Could not update the business.", slug: null };
  }
}

// ── SMS sender ID ───────────────────────────────────────────────────────────

/**
 * The alphanumeric label this tenant's texts are sent under (migration 0028).
 *
 * PLATFORM-ONLY, not in the client back office, and that is the point. A sender
 * ID has to be REGISTERED with the carrier before it will be delivered — an
 * unregistered one is rejected or silently relabelled. Letting a client type
 * their own would produce a field that looks configurable but mostly breaks
 * sending, so the value lives where the person who did the registering works.
 *
 * Writer-level rather than super admin: unlike repointing a login, the worst
 * case here is that the tenant's texts get rejected by the carrier — visible,
 * reversible, and not a path to their account.
 */
export async function updateSmsSenderId(formData: FormData): Promise<void> {
  const { user, role } = await requirePlatformWriter();
  const businessId = readBusinessId(formData);

  const parsed = updateBusinessSchema
    .pick({ smsSenderId: true })
    .safeParse({ smsSenderId: formData.get("smsSenderId") });
  if (!parsed.success) {
    fail(
      businessId,
      parsed.error.issues[0]?.message ?? "Enter a valid sender ID.",
    );
  }

  // Blank clears it. `?? null` rather than leaving it undefined, because the
  // repository skips undefined keys — which would make "clear this field"
  // silently do nothing.
  const senderId = parsed.data.smsSenderId ?? null;
  const error = await applySmsSenderId(businessId, senderId, user.id, role);
  if (error) fail(businessId, error);

  revalidatePath(`/platform/businesses/${businessId}`);
  // Not on the public site — no tenant cache to invalidate.
}

async function applySmsSenderId(
  businessId: string,
  smsSenderId: string | null,
  actorUserId: string,
  actorRole: PlatformRole,
): Promise<string | undefined> {
  try {
    const admin = createServiceClient();
    const repo = new BusinessRepository(admin);

    const existing = await repo.findById(businessId);
    if (!existing) return "That business no longer exists.";

    await repo.update(businessId, { smsSenderId });
    await new AuditRepository(admin).record({
      actorUserId,
      actingBusinessId: businessId,
      action: "business.updated",
      entity: "business",
      entityId: businessId,
      metadata: {
        field: "smsSenderId",
        from: existing.smsSenderId,
        to: smsSenderId,
        actorRole,
      },
    });
    return undefined;
  } catch (error) {
    logError(error, { scope: "platform:updateSmsSenderId" });
    return "Could not update the sender ID.";
  }
}

// ── Owner login email ───────────────────────────────────────────────────────

/**
 * Change the address the owner SIGNS IN with.
 *
 * This edits the Supabase auth user, not `businesses.email` — different things,
 * deliberately not synced. The auth email is the login identity; the business
 * email is the public contact printed on the website.
 *
 * SUPER ADMIN ONLY, unlike the name above. Repointing a client's login is one
 * password reset away from full access to their account, so misused it is
 * account takeover. Support staff can already act as a client — time-boxed,
 * bannered and audited — but silently and permanently moving the login is a
 * different power, and it belongs beside "remove this client".
 *
 * `email_confirm: true` applies it immediately instead of sending a
 * confirmation link. That is the whole point of doing it here: the usual reason
 * to change an address is that the old inbox is unreachable, so a flow that
 * requires clicking a link in it would fail exactly when it is needed.
 */
export async function updateOwnerEmail(formData: FormData): Promise<void> {
  const { user, role } = await requireSuperAdmin();
  const businessId = readBusinessId(formData);

  const parsed = z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .safeParse(formData.get("ownerEmail"));
  if (!parsed.success) {
    fail(businessId, parsed.error.issues[0]?.message ?? "Invalid email.");
  }

  // Absent means "no" here without ambiguity: this form always submits with
  // intent, so an unchecked box genuinely means don't — unlike a partial
  // update of a row, where a missing field means "leave it alone".
  const requireNewPassword = formData.get("requireNewPassword") === "yes";

  const error = await applyOwnerEmail(
    businessId,
    parsed.data,
    requireNewPassword,
    user.id,
    role,
  );
  if (error) fail(businessId, error);

  revalidatePath(`/platform/businesses/${businessId}`);
}

/**
 * Move the login, optionally forcing the owner to set a new password.
 *
 * "Force a new password" is the SAME auth user throughout — the account is
 * never deleted and re-invited. It cannot be: `businesses.owner_id` references
 * `auth.users(id) ON DELETE CASCADE`, and `customers`, `appointments`,
 * `review_messages` and `business_domains` all cascade from the business in
 * turn. Deleting the old user would hard-delete the entire tenant, not soft
 * delete it — every booking and customer gone, unrecoverable — and the
 * re-invited account would own nothing.
 *
 * Keeping the user and scrambling the password produces the outcome that was
 * actually wanted: the old address stops working, the old password stops
 * working, and the only way back in is the link sent to the new inbox.
 */
// ── Transfer to a new owner ─────────────────────────────────────────────────

/**
 * Hand the business to a DIFFERENT person: the new owner is invited, sets their
 * own password, and inherits the shop with all its data intact.
 *
 * Distinct from changing the login email, which keeps the same person. Use this
 * when the business genuinely changes hands and the audit trail should show
 * where one owner stopped and the next began.
 */
export async function transferOwnership(formData: FormData): Promise<void> {
  const { user, role } = await requireSuperAdmin();
  const businessId = readBusinessId(formData);

  const parsed = z
    .string()
    .trim()
    .email("Enter a valid email address for the new owner.")
    .safeParse(formData.get("newOwnerEmail"));
  if (!parsed.success) {
    fail(businessId, parsed.error.issues[0]?.message ?? "Invalid email.");
  }

  const error = await applyTransfer(
    businessId,
    parsed.data,
    String(formData.get("confirmSlug") ?? "").trim(),
    formData.get("removePreviousOwner") === "yes",
    user.id,
    role,
  );
  if (error) fail(businessId, error);

  revalidatePath(`/platform/businesses/${businessId}`);
}

/**
 * ORDER IS THE WHOLE SAFETY STORY HERE.
 *
 * `businesses.owner_id` references `auth.users(id) ON DELETE CASCADE`, and the
 * business cascades in turn to customers, appointments, review_messages and
 * domains. So the previous owner may only be deleted AFTER `owner_id` points
 * somewhere else. Delete first and the entire tenant goes with them —
 * irrecoverably, and without any error to say so.
 *
 * Steps: invite the new owner → repoint the business → only then remove the old
 * account. A failure between the first two rolls the invite back, so a broken
 * run leaves no orphan.
 */
async function applyTransfer(
  businessId: string,
  newOwnerEmail: string,
  confirmSlug: string,
  removePreviousOwner: boolean,
  actorUserId: string,
  actorRole: PlatformRole,
): Promise<string | null> {
  let invitedUserId: string | null = null;

  try {
    const admin = createServiceClient();
    const repo = new BusinessRepository(admin);

    const business = await repo.findById(businessId);
    if (!business) return "That business no longer exists.";

    // Same confirmation shape as removing a client: this hands someone else
    // the keys, and a mis-click shouldn't be able to do it.
    if (confirmSlug !== business.slug) {
      return `Type "${business.slug}" to confirm the transfer.`;
    }

    const { data: current } = await admin.auth.admin.getUserById(
      business.ownerId,
    );
    const previousEmail = current?.user?.email ?? null;
    if (previousEmail === newOwnerEmail) {
      return "That is already the owner's address. To change their email, use the field above.";
    }

    // 1. Invite. They set their own password from the email, exactly as a
    //    newly onboarded owner does.
    const invite = await admin.auth.admin.inviteUserByEmail(newOwnerEmail, {
      redirectTo: `${siteBaseUrl()}/auth/callback?next=/reset-password`,
    });
    if (invite.error || !invite.data?.user) {
      return /already|exists|registered/i.test(invite.error?.message ?? "")
        ? "That email already has an account. Transfers need an address that isn't registered yet."
        : "Could not invite the new owner.";
    }
    invitedUserId = invite.data.user.id;

    // 2. Repoint the business. Until this succeeds the invite is disposable;
    //    after it, the new owner holds the shop.
    const { error: moveError } = await admin
      .from("businesses")
      .update({ owner_id: invitedUserId })
      .eq("id", businessId);
    if (moveError) throw moveError;

    // 3. Now — and only now — the old account can go without taking the
    //    business with it. Non-fatal: the transfer has already happened, and
    //    an account that owns nothing is harmless.
    let previousRemoved = false;
    if (removePreviousOwner) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(
        business.ownerId,
      );
      previousRemoved = !deleteError;
      if (deleteError) {
        logError(deleteError, { scope: "platform:transferOwnership:cleanup" });
      }
    }

    await new AuditRepository(admin).record({
      actorUserId,
      actingBusinessId: businessId,
      action: "business.ownership_transferred",
      entity: "business",
      entityId: businessId,
      metadata: {
        fromUserId: business.ownerId,
        fromEmail: previousEmail,
        toUserId: invitedUserId,
        toEmail: newOwnerEmail,
        previousOwnerRemoved: previousRemoved,
        actorRole,
      },
    });

    return removePreviousOwner && !previousRemoved
      ? "Ownership transferred, but the previous owner's account could not be removed. Delete it in Supabase if needed."
      : null;
  } catch (error) {
    // The invite happened but the handover didn't — take the orphan back out,
    // the same rollback platform onboarding does.
    if (invitedUserId) {
      await createServiceClient()
        .auth.admin.deleteUser(invitedUserId)
        .catch(() => {});
    }
    logError(error, { scope: "platform:transferOwnership" });
    return "Could not transfer ownership. Nothing was changed.";
  }
}

async function applyOwnerEmail(
  businessId: string,
  email: string,
  requireNewPassword: boolean,
  actorUserId: string,
  actorRole: PlatformRole,
): Promise<string | null> {
  try {
    const admin = createServiceClient();
    const business = await new BusinessRepository(admin).findById(businessId);
    if (!business) return "That business no longer exists.";

    const { data: current } = await admin.auth.admin.getUserById(
      business.ownerId,
    );
    const previous = current?.user?.email ?? null;
    if (previous === email && !requireNewPassword) return null;

    const { error } = await admin.auth.admin.updateUserById(business.ownerId, {
      email,
      email_confirm: true,
      // Replaced with a value nobody holds — including us. The owner cannot
      // sign in with the old password afterwards, so the recovery link below
      // is the only route back in.
      ...(requireNewPassword
        ? { password: `${crypto.randomUUID()}${crypto.randomUUID()}` }
        : {}),
    });
    if (error) {
      // Surfaced rather than swallowed: "already registered" is the common
      // failure and the operator can act on it, unlike a generic message.
      return /already|exists|registered|duplicate/i.test(error.message)
        ? "Another account already uses that email address."
        : "Could not change the login email.";
    }

    if (requireNewPassword) {
      // Sent AFTER the address change so the link lands in the new inbox. Same
      // recovery flow as the public "forgot password" form, so the owner ends
      // up on the same /reset-password screen.
      const { error: mailError } = await admin.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${siteBaseUrl()}/auth/callback?next=/reset-password` },
      );
      if (mailError) {
        // The email HAS moved and the password IS scrambled by now, so this is
        // not a rollback situation — say plainly what state it is in.
        logError(mailError, { scope: "platform:updateOwnerEmail:recovery" });
        return "Email changed, but the password-reset link could not be sent. Use the client's 'Forgot password' form with the new address.";
      }
    }

    await new AuditRepository(admin).record({
      actorUserId,
      actingBusinessId: businessId,
      action: "owner.email_changed",
      entity: "auth_user",
      entityId: business.ownerId,
      // The OLD address is recorded here because nothing else keeps it — once
      // this call returns there is no way to find out what it used to be.
      metadata: { from: previous, to: email, requireNewPassword, actorRole },
    });

    return null;
  } catch (error) {
    logError(error, { scope: "platform:updateOwnerEmail" });
    return "Could not change the login email.";
  }
}
