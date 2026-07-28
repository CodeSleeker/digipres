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
export default async function LoginPage() {
  const supabase = await createClient();

  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }
  if (user) redirect(await landingPathFor(supabase, user.id));

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your dashboard to manage your website, customers and reviews."
    >
      <LoginForm />
    </AuthShell>
  );
}
