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
 * Meta's callback-verification handshake.
 *
 * Meta GETs the callback URL with `hub.mode=subscribe`, the verify token we
 * gave it, and a `hub.challenge` it expects echoed back verbatim. Returns the
 * challenge when the request is genuine, otherwise null.
 *
 * The token comparison is constant time for the same reason the signature one
 * is: this endpoint is public, unauthenticated and unrate-limited by Meta's
 * design, so it will be probed.
 */
export function verifyChallenge(
  expectedToken: string,
  params: URLSearchParams,
): string | null {
  if (params.get("hub.mode") !== "subscribe") return null;

  const provided = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (!provided || !challenge) return null;

  const a = Buffer.from(expectedToken);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return challenge;
}
