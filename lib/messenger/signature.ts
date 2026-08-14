import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validate Meta's `X-Hub-Signature-256` for a Messenger webhook delivery.
 *
 * Meta computes: `sha256=` + hex( HMAC-SHA256( appSecret, RAW request body ) ).
 * We recompute and compare in constant time — this is what proves a delivery
 * really came from Meta rather than from anyone who guessed the callback URL,
 * which is public by construction.
 *
 * RAW BODY, not a re-serialized object. `JSON.parse` followed by
 * `JSON.stringify` reorders keys and drops insignificant whitespace, and the
 * digest is over the exact bytes Meta signed — so a parsed-then-restringified
 * body fails verification for every payload that isn't already canonical. The
 * caller must read the body as text and hand that same string to the parser.
 */
export function isValidMetaSignature(
  appSecret: string,
  rawBody: string,
  header: string | null | undefined,
): boolean {
  if (!header) return false;

  // The header is prefixed with the algorithm. Meta has used `sha1=` in the
  // past; we accept only the sha256 form we compute, rather than trusting the
  // sender to pick the algorithm we verify with.
  const [algorithm, digest] = header.split("=", 2);
  if (algorithm !== "sha256" || !digest) return false;

  const expected = createHmac("sha256", appSecret)
    .update(Buffer.from(rawBody, "utf-8"))
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(digest);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Why a verification request was refused, or the challenge to echo back.
 *
 * A bare null was not enough, and the cost of that was a day.
 *
 * Meta re-verifies a callback periodically and will NOT deliver messages to one
 * it cannot verify — so a failing handshake silently stops every message,
 * while the app dashboard still shows a subscription that looks healthy. All
 * four causes returned 403 with nothing written anywhere, which is
 * indistinguishable from Meta never calling at all.
 */
export type ChallengeResult =
  | { ok: true; challenge: string }
  | { ok: false; reason: string };

/**
 * Meta's callback-verification handshake.
 *
 * Meta GETs the callback URL with `hub.mode=subscribe`, the verify token we
 * gave it, and a `hub.challenge` it expects echoed back verbatim.
 *
 * The token comparison is constant time for the same reason the signature one
 * is: this endpoint is public, unauthenticated and unrate-limited by Meta's
 * design, so it will be probed.
 */
export function verifyChallenge(
  expectedToken: string,
  params: URLSearchParams,
): ChallengeResult {
  const mode = params.get("hub.mode");
  if (mode !== "subscribe") {
    /* A plain GET with no parameters is the common case here — a crawler, an
       uptime check, someone opening the URL in a browser. Naming it stops that
       ordinary noise being mistaken for a broken handshake. */
    return {
      ok: false,
      reason: mode
        ? `hub.mode was "${mode}", expected "subscribe"`
        : "no hub.mode — not a verification request (ordinary GET traffic)",
    };
  }

  const provided = params.get("hub.verify_token");
  if (!provided) return { ok: false, reason: "no hub.verify_token" };

  const challenge = params.get("hub.challenge");
  if (!challenge) return { ok: false, reason: "no hub.challenge to echo" };

  const a = Buffer.from(expectedToken);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    /*
     * LENGTHS, never the values.
     *
     * The token itself must not reach a log, but the two lengths are what
     * actually identify the mistake: equal lengths mean a genuinely different
     * string, and unequal ones point straight at a truncated paste or trailing
     * whitespace — which is exactly how this failed in practice.
     */
    return {
      ok: false,
      reason:
        `hub.verify_token does not match META_WEBHOOK_VERIFY_TOKEN on this ` +
        `deployment (expected ${a.length} chars, received ${b.length}). ` +
        `Re-enter it in Messenger → Settings → Webhooks.`,
    };
  }

  return { ok: true, challenge };
}
