import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison. `timingSafeEqual` throws on a length mismatch, so
 * the length is checked first — that leak is the length only, not the secret.
 */
export function safeEqual(a: string | null, b: string): boolean {
  if (a === null) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Is this request the scheduler? Fails closed when `CRON_SECRET` is unset —
 * an unconfigured deployment must not expose an open job endpoint.
 */
export function isAuthorizedCron(authorizationHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && safeEqual(authorizationHeader, `Bearer ${secret}`);
}
