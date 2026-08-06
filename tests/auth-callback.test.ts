import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The emailed-link callback.
 *
 * Worth testing precisely because nothing else exercises it: it only runs when
 * a real person clicks a real link in a real inbox, which means a regression
 * here is discovered by a client who cannot get into their account — the worst
 * possible reporter.
 *
 * The bug these pin: the route handled only the PKCE `code` exchange, so an
 * invite (created server-side, with no code verifier on the recipient's device)
 * always failed.
 */

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn() }));

import { GET } from "@/app/auth/callback/route";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery-session";
import type { NextRequest } from "next/server";

const call = (query: string) =>
  GET(new Request(`https://app.test/auth/callback${query}`) as NextRequest);

beforeEach(() => {
  verifyOtp.mockReset().mockResolvedValue({ error: null });
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
});

describe("auth callback — invites", () => {
  it("verifies a token_hash link without needing a code verifier", async () => {
    const res = await call(
      "?token_hash=abc123&type=invite&next=/reset-password",
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      type: "invite",
      token_hash: "abc123",
    });
    // Never attempt the PKCE exchange for a server-sent link — that is the
    // whole defect.
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://app.test/reset-password");
  });

  it("grants the recovery session so an invitee can set a first password", async () => {
    // An invited owner has never had a password, so /reset-password must not
    // ask them for their current one.
    const res = await call("?token_hash=abc&type=invite&next=/reset-password");
    expect(res.cookies.get(RECOVERY_COOKIE)?.value).toBe("1");
  });

  it("withholds the recovery session for any other destination", async () => {
    const res = await call("?token_hash=abc&type=invite&next=/admin");
    expect(res.cookies.get(RECOVERY_COOKIE)).toBeUndefined();
  });
});

describe("auth callback — password reset still works", () => {
  it("exchanges a PKCE code when there is no token hash", async () => {
    const res = await call("?code=xyz&next=/reset-password");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://app.test/reset-password");
  });
});

describe("auth callback — failures say which failure", () => {
  it("reports an expired link from Supabase's own parameters", async () => {
    const res = await call("?error=access_denied&error_code=otp_expired");
    expect(res.headers.get("location")).toBe(
      "https://app.test/login?error=link_expired",
    );
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("reports an expired link when verification says so", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "Token has expired" } });
    const res = await call("?token_hash=abc&type=recovery");
    expect(res.headers.get("location")).toBe(
      "https://app.test/login?error=link_expired",
    );
  });

  it("reports an unusable link when verification fails otherwise", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "Token not found" } });
    const res = await call("?token_hash=abc&type=invite");
    expect(res.headers.get("location")).toBe(
      "https://app.test/login?error=link_invalid",
    );
  });

  it("refuses a link carrying nothing to verify", async () => {
    const res = await call("");
    expect(res.headers.get("location")).toBe(
      "https://app.test/login?error=link_invalid",
    );
  });

  it("ignores an unrecognised type rather than forwarding it", async () => {
    // The value comes straight off a URL; it must not reach the auth client.
    const res = await call("?token_hash=abc&type=not-a-real-type");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "https://app.test/login?error=link_invalid",
    );
  });
});

describe("auth callback — redirect safety", () => {
  it.each(["//evil.test", "https://evil.test", "javascript:alert(1)"])(
    "refuses to forward to %s",
    async (target) => {
      const res = await call(
        `?token_hash=abc&type=invite&next=${encodeURIComponent(target)}`,
      );
      expect(res.headers.get("location")).toBe("https://app.test/admin");
    },
  );
});
