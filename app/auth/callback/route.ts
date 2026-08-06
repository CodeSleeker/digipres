import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/logger";
import {
  RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-session";

export const dynamic = "force-dynamic";

const RESET_PATH = "/reset-password";

/** Just the two calls this route makes, so the branches share a shape. */
type SupabaseAuth = Pick<
  Awaited<ReturnType<typeof createClient>>["auth"],
  "verifyOtp" | "exchangeCodeForSession"
>;

/**
 * The landing point for every emailed auth link.
 *
 * TWO FLOWS ARRIVE HERE, and the difference between them is which browser
 * started the flow.
 *
 *  - `token_hash` + `type` — a link the SERVER sent (an invite, or a reset
 *    triggered on someone's behalf). Verified with `verifyOtp`, which needs no
 *    prior state on the device: the person clicking may never have opened this
 *    site before.
 *
 *  - `code` — PKCE, for a flow the visitor began in THIS browser. The exchange
 *    needs the code verifier that was stored when the flow started.
 *
 * The distinction is not academic; it is why invites failed. An invite is
 * created server-side from the agency operator's session, so no code verifier
 * ever exists on the invited client's machine. They clicked, arrived with
 * nothing that could be exchanged, and were bounced to the sign-in page with a
 * bare `?error=`. Password resets worked throughout, because the person
 * resetting starts the flow in their own browser — which is exactly what hid
 * the bug.
 *
 * Supabase can also redirect here with its OWN error parameters, for a link
 * that has expired or already been used. Those are passed through as a specific
 * reason rather than flattened into one generic failure, so the sign-in page
 * can tell the person what to do next.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Only local, non-protocol-relative targets (no open redirect).
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/admin";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${reason}`);

  // Supabase rejected the link before it ever reached us.
  const providerError =
    searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) {
    return fail(
      providerError.includes("expired") ? "link_expired" : "link_invalid",
    );
  }

  const tokenHash = searchParams.get("token_hash");
  const type = emailOtpType(searchParams.get("type"));
  const code = searchParams.get("code");

  /*
   * Resolve to ONE verification up front, so neither branch can be entered
   * without the value it needs. Written as a ternary, this let a link carrying
   * a token hash and an unrecognised `type` fall through to the code exchange
   * and hand it a null — which the auth client would have rejected, but by
   * accident rather than by design.
   */
  const verify =
    tokenHash && type
      ? (client: SupabaseAuth) => client.verifyOtp({ type, token_hash: tokenHash })
      : code
        ? (client: SupabaseAuth) => client.exchangeCodeForSession(code)
        : null;

  if (!verify) return fail("link_invalid");

  try {
    const supabase = await createClient();

    const { error } = await verify(supabase.auth);

    if (error) {
      logError(error, { scope: "auth:callback", linkType: type ?? "code" });
      return fail(
        /expired/i.test(error.message) ? "link_expired" : "link_invalid",
      );
    }

    const response = NextResponse.redirect(`${origin}${next}`);
    /*
     * Record that this session came from a valid emailed link, so
     * /reset-password knows not to demand a current password the person plainly
     * does not have — an invited owner has never had one.
     *
     * Set only after verification succeeds, and only for the reset destination
     * (see lib/auth/recovery-session.ts).
     */
    if (next === RESET_PATH) {
      response.cookies.set(RECOVERY_COOKIE, "1", recoveryCookieOptions());
    }
    return response;
  } catch (error) {
    logError(error, { scope: "auth:callback" });
    return fail("link_invalid");
  }
}

/**
 * Narrow `type` to the email link kinds Supabase accepts.
 *
 * An allow-list, because the value is read straight off a URL and handed to the
 * auth client — anything unrecognised is treated as no type at all rather than
 * forwarded.
 */
const EMAIL_OTP_TYPES: EmailOtpType[] = [
  "invite",
  "recovery",
  "signup",
  "magiclink",
  "email",
  "email_change",
];

function emailOtpType(value: string | null): EmailOtpType | null {
  return EMAIL_OTP_TYPES.find((t) => t === value) ?? null;
}
