import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * "Act as" tokens — how platform staff temporarily operate a tenant's back
 * office to help them.
 *
 * The cookie is HMAC-signed and carries three things: the tenant, the ACTOR it
 * was issued to, and an expiry. That means it can't be forged, can't be replayed
 * by a different signed-in user, and dies on its own.
 *
 * It is never the authorization decision by itself — the context resolver also
 * re-checks `platform_admins` in the database on every request. Two independent
 * gates: possession of a valid token AND current staff status.
 */
const COOKIE_NAME = "dp_act_as";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface TokenPayload {
  /** businessId being acted on. */
  b: string;
  /** actor (platform staff) user id the token was issued to. */
  a: string;
  /** expiry, epoch ms. */
  exp: number;
}

/**
 * Signing key. Prefers a dedicated secret; falls back to the service-role key,
 * which is required for impersonation to function anyway — so this works with
 * no extra configuration, and rotating either key invalidates live sessions.
 */
function secret(): string | null {
  return (
    process.env.IMPERSONATION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payloadB64: string, key: string): string {
  return base64url(createHmac("sha256", key).update(payloadB64).digest());
}

/** Issue a token, or null when no signing key is configured. */
export function signImpersonationToken(
  businessId: string,
  actorUserId: string,
  now: number = Date.now(),
): string | null {
  const key = secret();
  if (!key) return null;

  const payload: TokenPayload = {
    b: businessId,
    a: actorUserId,
    exp: now + TTL_MS,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, key)}`;
}

/**
 * Verify a token and return the businessId it authorizes, or null.
 * Rejects: bad signature, expiry, and tokens issued to a different actor.
 */
export function verifyImpersonationToken(
  token: string | null | undefined,
  actorUserId: string,
  now: number = Date.now(),
): string | null {
  const key = secret();
  if (!key || !token) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = Buffer.from(sign(payloadB64, key));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf-8"),
    ) as TokenPayload;

    if (!payload.b || !payload.a) return null;
    if (payload.exp <= now) return null;
    // Bound to the actor: a stolen cookie is useless in someone else's session.
    if (payload.a !== actorUserId) return null;

    return payload.b;
  } catch {
    return null;
  }
}

/* --- Cookie plumbing ------------------------------------------------------ */

export async function readImpersonationCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setImpersonationCookie(
  businessId: string,
  actorUserId: string,
): Promise<boolean> {
  const token = signImpersonationToken(businessId, actorUserId);
  if (!token) return false;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return true;
}

export async function clearImpersonationCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
