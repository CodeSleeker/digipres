import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { landingPathFor } from "@/lib/auth/landing-path";
import { AuthShell } from "@/components/marketing/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Aliamz Digital",
  robots: { index: false, follow: false },
};

/**
 * Platform sign-in (Server Component).
 *
 * An existing session is sent to wherever that user belongs — the portal for
 * platform staff, the back office for owners (the middleware does this too;
 * this is the defensive fallback). `getUser()` is wrapped so an unconfigured
 * Supabase project just shows the form instead of erroring.
 */
/**
 * What went wrong with the link that sent someone here.
 *
 * The callback used to redirect with `?error=recovery` and nothing read it, so
 * a person whose invite failed saw a sign-in form, no explanation, and a word
 * in the address bar. Every one of these is actionable, and each says who can
 * act — the visitor can ask for a new link; only we can fix a misconfigured
 * redirect.
 */
const LINK_ERRORS: Record<string, string> = {
  link_expired:
    "That link has expired. Ask for a new one and open it within the hour.",
  link_invalid:
    "That link could not be used. It may already have been opened — links work once. Ask for a new one, or get in touch if it keeps happening.",
  // The pre-existing value, still emitted by older links in flight.
  recovery:
    "That link could not be used. Ask for a new one, or get in touch if it keeps happening.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { error } = await searchParams;

  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }
  if (user) redirect(await landingPathFor(supabase, user.id));

  const message = error ? (LINK_ERRORS[error] ?? LINK_ERRORS.link_invalid) : null;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your dashboard to manage your website, customers and reviews."
    >
      {message && (
        <p
          role="alert"
          className="mb-5 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-admin-fg"
        >
          {message}
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
