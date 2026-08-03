"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { landingPathFor } from "./landing-path";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { siteBaseUrl } from "@/lib/tenant/urls";
import { logError } from "@/lib/observability/logger";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
import {
  clearRecoverySession,
  hasRecoverySession,
} from "./recovery-session";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "./schema";

export type LoginState = { error?: string };

/**
 * Email/password sign-in server action (used with `useActionState` in the login
 * form). Validates with Zod, calls Supabase, and on success refreshes cached
 * layouts and redirects into the protected area.
 *
 * On failure it returns a single, intentionally generic message — we never
 * surface Supabase's internal error text (skill: "Never expose internal
 * errors" / avoid leaking whether an email exists).
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Throttle brute-force attempts by client IP.
  const ip = ipFromHeaders(await headers());
  if (!rateLimit(`login:${ip}`, 5, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password." };
  }

  // Defense in depth: never admit a session whose email isn't confirmed — even
  // if the Supabase "Confirm email" setting is later disabled, or an account is
  // created out-of-band. When the setting is on, signInWithPassword already
  // rejects unconfirmed users; this guarantees it at the app layer too. The
  // credentials were valid here, so naming the reason is safe (not enumeration).
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return {
      error:
        "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
    };
  }

  // Platform staff belong in the portal, tenant owners in their back office.
  const destination = await landingPathFor(supabase, data.user.id);

  // Drop any cached anonymous renders now that the user is authenticated.
  revalidatePath("/", "layout");
  redirect(destination);
}

export type ForgotState = { error?: string; sent?: boolean };

/**
 * Send a password-reset email. The link returns the user to /auth/callback,
 * which exchanges the code for a recovery session and forwards to /reset-password.
 * Always reports success — never reveals whether an email is registered.
 */
export async function requestPasswordReset(
  _prevState: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Throttle reset-email requests by client IP (prevent email bombing).
  const ip = ipFromHeaders(await headers());
  if (!rateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000).ok) {
    return { error: "Too many requests. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteBaseUrl()}/auth/callback?next=/reset-password`,
  });

  return { sent: true };
}

export type ResetState = { error?: string };

/**
 * Set a new password.
 *
 * TWO ways in, and they are not equally trusted:
 *
 *  - Recovery link. `/auth/callback` exchanged an emailed code, so the person
 *    has proven control of the mailbox. No current password — they don't have
 *    one, that's why they're here.
 *  - Ordinary signed-in session. The current password IS required. Without that
 *    check, any open session was enough to change the password and lock the real
 *    owner out: an unattended laptop or a stolen cookie became a permanent
 *    account takeover. That matters most for the super admin, who can act as
 *    every tenant.
 */
export async function updatePassword(
  _prevState: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? undefined,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link is invalid or has expired." };
  }

  const fromRecovery = await hasRecoverySession();

  if (!fromRecovery) {
    // Throttled per user, not per IP: the attacker being modelled already holds
    // the session, so they control the IP too.
    if (!rateLimit(`pwchange:${user.id}`, 5, 15 * 60 * 1000).ok) {
      return { error: "Too many attempts. Please try again in a few minutes." };
    }

    const current = parsed.data.currentPassword?.trim();
    if (!current) {
      return { error: "Enter your current password." };
    }
    if (!user.email) {
      return {
        error:
          "This account has no email address, so the password can't be changed here.",
      };
    }
    if (!(await passwordIsCorrect(user.email, current))) {
      return { error: "That current password is incorrect." };
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Could not update your password. Please try again." };
  }

  // One recovery link buys exactly one password change.
  if (fromRecovery) await clearRecoverySession();

  // Kick out every OTHER session. If the reason for changing the password was a
  // session someone else had, leaving it alive would defeat the whole exercise.
  // Best-effort: the password is already changed, and failing here must not
  // report an error for something that worked.
  try {
    await supabase.auth.signOut({ scope: "others" });
  } catch (error) {
    logError(error, { scope: "auth:signOutOthers" });
  }

  // Same routing rule as sign-in — a staff member setting their password for
  // the first time lands in the portal, not on an empty tenant dashboard.
  const destination = await landingPathFor(supabase, user.id);

  revalidatePath("/", "layout");
  redirect(destination);
}

/**
 * Verify a password without disturbing the caller's session.
 *
 * `createPublicClient` is cookie-less, so this sign-in issues a throwaway token
 * that is never persisted. Using the request-bound client would rotate the
 * user's auth cookies as a side effect of a validation check.
 */
async function passwordIsCorrect(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    const { error } = await createPublicClient().auth.signInWithPassword({
      email,
      password,
    });
    return !error;
  } catch (error) {
    // Treat an unreachable auth server as "not verified" — failing closed is the
    // only safe direction for a check whose whole job is to say no.
    logError(error, { scope: "auth:verifyCurrentPassword" });
    return false;
  }
}

/**
 * Sign the current user out and return them to the login page.
 * Triggered from a `<form action={logout}>` on the server.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
