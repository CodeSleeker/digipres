import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/logger";
import {
  RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-session";

export const dynamic = "force-dynamic";

const RESET_PATH = "/reset-password";

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
      if (!error) {
        const response = NextResponse.redirect(`${origin}${next}`);
        // Record that this session came from a valid emailed code, so
        // /reset-password knows not to demand a current password the person
        // plainly does not have. Set only after the exchange succeeds, and only
        // for the reset destination — see lib/auth/recovery-session.ts.
        if (next === RESET_PATH) {
          response.cookies.set(
            RECOVERY_COOKIE,
            "1",
            recoveryCookieOptions(),
          );
        }
        return response;
      }
    } catch (error) {
      logError(error, { scope: "auth:callback" });
    }
  }

  return NextResponse.redirect(`${origin}/login?error=recovery`);
}
