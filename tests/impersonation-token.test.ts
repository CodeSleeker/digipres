import { describe, it, expect, afterEach, vi } from "vitest";
import {
  signImpersonationToken,
  verifyImpersonationToken,
} from "@/lib/auth/impersonation";

const BIZ = "biz-A";
const ACTOR = "staff-1";
const OTHER = "staff-2";

function withSecret() {
  vi.stubEnv("IMPERSONATION_SECRET", "test-signing-secret");
}

describe("impersonation token", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips the business id for the actor it was issued to", () => {
    withSecret();
    const token = signImpersonationToken(BIZ, ACTOR);
    expect(token).toBeTruthy();
    expect(verifyImpersonationToken(token, ACTOR)).toBe(BIZ);
  });

  it("refuses a token issued to a DIFFERENT user (stolen cookie)", () => {
    withSecret();
    const token = signImpersonationToken(BIZ, ACTOR);
    expect(verifyImpersonationToken(token, OTHER)).toBeNull();
  });

  it("refuses a tampered payload", () => {
    withSecret();
    const token = signImpersonationToken(BIZ, ACTOR)!;
    const [, signature] = token.split(".");
    // Re-point the token at another tenant, keeping the original signature.
    const forgedPayload = Buffer.from(
      JSON.stringify({ b: "biz-B", a: ACTOR, exp: Date.now() + 60_000 }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(
      verifyImpersonationToken(`${forgedPayload}.${signature}`, ACTOR),
    ).toBeNull();
  });

  it("refuses a tampered signature", () => {
    withSecret();
    const token = signImpersonationToken(BIZ, ACTOR)!;
    const [payload] = token.split(".");
    expect(verifyImpersonationToken(`${payload}.deadbeef`, ACTOR)).toBeNull();
  });

  it("expires", () => {
    withSecret();
    const issuedAt = Date.now();
    const token = signImpersonationToken(BIZ, ACTOR, issuedAt);
    // Still valid inside the window, gone after it.
    expect(verifyImpersonationToken(token, ACTOR, issuedAt + 60_000)).toBe(BIZ);
    expect(
      verifyImpersonationToken(token, ACTOR, issuedAt + 31 * 60_000),
    ).toBeNull();
  });

  it("refuses a token signed with a different secret (key rotation)", () => {
    withSecret();
    const token = signImpersonationToken(BIZ, ACTOR);
    vi.stubEnv("IMPERSONATION_SECRET", "rotated-secret");
    expect(verifyImpersonationToken(token, ACTOR)).toBeNull();
  });

  it("issues nothing when no signing key is configured", () => {
    vi.stubEnv("IMPERSONATION_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(signImpersonationToken(BIZ, ACTOR)).toBeNull();
    expect(verifyImpersonationToken("anything.here", ACTOR)).toBeNull();
  });

  it("handles malformed input", () => {
    withSecret();
    expect(verifyImpersonationToken(null, ACTOR)).toBeNull();
    expect(verifyImpersonationToken("", ACTOR)).toBeNull();
    expect(verifyImpersonationToken("no-dot", ACTOR)).toBeNull();
    expect(verifyImpersonationToken("!!!.???", ACTOR)).toBeNull();
  });
});
