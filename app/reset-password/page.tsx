import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Set new password · Admin",
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
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16">
      <div className="w-full max-w-sm border border-dark-border bg-dark p-8">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-[1.6rem] tracking-[2px] text-white">
            SET NEW PASSWORD
          </h1>
          <p className="mt-2 text-[0.85rem] text-gray">
            Choose a new password for your account.
          </p>
        </div>

        {hasSession ? (
          <ResetForm />
        ) : (
          <div className="text-center text-sm text-gray-light">
            <p>This reset link is invalid or has expired.</p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block text-xs uppercase tracking-[2px] text-gold hover:text-gold-light"
            >
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
