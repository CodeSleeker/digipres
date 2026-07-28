import { describe, it, expect } from "vitest";
import { rateLimit, ipFromHeaders } from "@/lib/security/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit, then blocks within the window", () => {
    const key = `test-${Math.random()}`;
    const limit = 3;
    const window = 60_000;

    expect(rateLimit(key, limit, window).ok).toBe(true); // 1
    expect(rateLimit(key, limit, window).ok).toBe(true); // 2
    const third = rateLimit(key, limit, window); // 3
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);

    const blocked = rateLimit(key, limit, window); // 4 — over
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("keeps separate counters per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true); // b unaffected
  });

  it("resets once the window elapses", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 1, 1).ok).toBe(true); // 1ms window
    const past = Date.now() + 5;
    while (Date.now() < past) {
      /* spin briefly past the 1ms window */
    }
    expect(rateLimit(key, 1, 1).ok).toBe(true); // window elapsed → allowed again
  });
});

describe("ipFromHeaders", () => {
  it("uses the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(ipFromHeaders(h)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip then 'unknown'", () => {
    expect(ipFromHeaders(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe(
      "9.9.9.9",
    );
    expect(ipFromHeaders(new Headers())).toBe("unknown");
  });
});
