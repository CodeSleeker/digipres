/**
 * Lightweight fixed-window rate limiter (dependency-free, in-memory).
 *
 * CAVEAT: state lives in the process. On serverless it is NOT shared across
 * instances and does not survive cold starts — it blunts bursts on a warm
 * instance but is not a strict distributed limit. For that, back it with
 * Upstash/Redis by replacing the `store` operations (the call sites don't change).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
  /** Seconds until reset (for a Retry-After header). */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    if (store.size > 10_000) cleanup(now);
    return { ok: true, remaining: limit - 1, resetAt, retryAfter: 0 };
  }

  bucket.count += 1;
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Best-effort client IP from proxy headers. */
export function ipFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

function cleanup(now: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}
