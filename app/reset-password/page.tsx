import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/marketing/auth-shell";
import { BRAND } from "@/components/marketing/theme";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Set new password · Aliamz Digital",
  robots: { index: false, follow: false },
};

/**
 * Shown after the email link lands via /auth/callback (which establishes a
 * recovery session). If there's no session the link is invalid/expired, so we
 * point the user back to request a new one.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();

  let hasSession = false;
  try {
    hasSession = Boolean((await supabase.auth.getUser()).data.user);
  } catch {
    hasSession = false;
  }

  return (
    <AuthShell
      title="Set new password"
      subtitle="Choose a new password for your account."
    >
      {hasSession ? (
        <ResetForm />
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
