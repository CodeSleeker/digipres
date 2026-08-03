import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/marketing/auth-shell";
import { BRAND } from "@/components/marketing/theme";
import { ResetForm } from "./reset-form";
import { hasRecoverySession } from "@/lib/auth/recovery-session";

export const metadata: Metadata = {
  title: "Set new password · Aliamz Digital",
  robots: { index: false, follow: false },
};

/**
 * Two audiences, one page.
 *
 * Arriving from a reset email, /auth/callback has already established a recovery
 * session and left a marker cookie — no current password is asked for, because
 * the person doesn't have one. Arriving as an ordinary signed-in user (this page
 * is not behind the auth gate, and a signed-in user can simply navigate here),
 * the current password is required. The action enforces it either way; this only
 * decides which field to render.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();

  let hasSession = false;
  try {
    hasSession = Boolean((await supabase.auth.getUser()).data.user);
  } catch {
    hasSession = false;
  }

  const fromRecovery = await hasRecoverySession();

  return (
    <AuthShell
      title={fromRecovery ? "Set new password" : "Change password"}
      subtitle={
        fromRecovery
          ? "Choose a new password for your account."
          : "Confirm your current password, then choose a new one."
      }
    >
      {hasSession ? (
        <ResetForm requireCurrentPassword={!fromRecovery} />
      ) : (
        <div className={`text-sm leading-relaxed ${BRAND.muted}`}>
          <p>This reset link is invalid or has expired.</p>
          <Link
            href="/forgot-password"
            className={`mt-6 inline-block ${BRAND.link}`}
          >
            Request a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
