"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { siteBaseUrl } from "@/lib/tenant/urls";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
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

  // Drop any cached anonymous renders now that the user is authenticated.
  revalidatePath("/", "layout");
  redirect("/admin");
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
 * Set a new password. Requires the recovery session established by the email
 * link (via /auth/callback); otherwise the link has expired.
 */
export async function updatePassword(
  _prevState: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse({
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

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Could not update your password. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
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
