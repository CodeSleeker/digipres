import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin login page (Server Component).
 *
 * If the visitor already has a valid session it sends them straight to /admin
 * (the middleware does this too; this is a defensive fallback). Otherwise it
 * renders the client login form. `getUser()` is wrapped so an unconfigured
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
  if (user) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16">
      <div className="w-full max-w-sm border border-dark-border bg-dark p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold font-heading text-[1.5rem] text-black">
            R
          </div>
          <h1 className="font-heading text-[1.6rem] tracking-[2px] text-white">
            ADMIN SIGN IN
          </h1>
          <p className="mt-2 text-[0.85rem] text-gray">
            Access your business dashboard.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
