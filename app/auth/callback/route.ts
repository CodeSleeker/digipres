import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * OAuth/recovery callback. Exchanges the `code` from an email link for a session
 * (sets the auth cookies), then forwards to `next`. Used by the password-reset
 * flow: the reset email points here, and we land the user on /reset-password
 * with a recovery session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow local, non-protocol-relative redirect targets (no open redirect).
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/admin";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    } catch (error) {
      logError(error, { scope: "auth:callback" });
    }
  }

  return NextResponse.redirect(`${origin}/login?error=recovery`);
}
