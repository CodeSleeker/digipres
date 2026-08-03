import { cookies } from "next/headers";

/**
 * Marks the CURRENT session as having come from a password-reset email link.
 *
 * Why a cookie rather than reading the session:
 *
 * `/reset-password` serves two different people. One clicked a recovery link and
 * by definition cannot supply their current password — demanding it would make
 * the reset flow useless. The other is simply signed in, and for them the
 * current password is the only thing standing between a borrowed session and a
 * stolen account. The two have to be told apart, and the only trustworthy signal
 * is whether THIS request's session was minted by a valid recovery code.
 *
 * Supabase does expose `amr` claims that hint at this, but their exact shape is
 * an implementation detail of the auth server. Something a security check turns
 * on should not depend on an undocumented claim quietly changing shape.
 *
 * The cookie proves nothing on its own — it is httpOnly and only ever written by
 * the callback route AFTER `exchangeCodeForSession` succeeds, which requires a
 * code that was emailed to the account owner. A signed-in attacker cannot set it
 * from the browser, and cannot obtain one without reading the victim's email.
 */
export const RECOVERY_COOKIE = "dp_pw_recovery";

/**
 * Short on purpose. It only has to survive the redirect from the callback to the
 * form and the submit that follows; anything longer widens the window in which a
 * later, ordinary visit to /reset-password skips the password check.
 */
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60; // seconds

export function recoveryCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RECOVERY_COOKIE_MAX_AGE,
  };
}

/** True when this request carries a valid recovery marker. */
export async function hasRecoverySession(): Promise<boolean> {
  return (await cookies()).get(RECOVERY_COOKIE)?.value === "1";
}

/** Consume the marker, so one recovery link buys exactly one password change. */
export async function clearRecoverySession(): Promise<void> {
  (await cookies()).set(RECOVERY_COOKIE, "", {
    ...recoveryCookieOptions(),
    maxAge: 0,
  });
}
