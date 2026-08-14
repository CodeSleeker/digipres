import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  isValidMetaSignature,
  verifyChallenge,
} from "@/lib/messenger/signature";

const SECRET = "app-secret-value";

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf-8").digest("hex")}`;
}

describe("isValidMetaSignature", () => {
  const body = JSON.stringify({ object: "page", entry: [{ id: "123" }] });

  it("accepts a correctly signed body", () => {
    expect(isValidMetaSignature(SECRET, body, sign(body))).toBe(true);
  });

  it("rejects a body signed with a different secret", () => {
    expect(isValidMetaSignature(SECRET, body, sign(body, "wrong"))).toBe(false);
  });

  it("rejects a tampered body", () => {
    const header = sign(body);
    const tampered = JSON.stringify({ object: "page", entry: [{ id: "999" }] });
    expect(isValidMetaSignature(SECRET, tampered, header)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidMetaSignature(SECRET, body, null)).toBe(false);
    expect(isValidMetaSignature(SECRET, body, undefined)).toBe(false);
    expect(isValidMetaSignature(SECRET, body, "")).toBe(false);
  });

  /*
   * The digest is right but the algorithm label is not. Accepting this would
   * let a sender nominate a weaker algorithm than the one we verify with.
   */
  it("rejects a sha1-labelled header even with a valid sha256 digest", () => {
    const digest = sign(body).slice("sha256=".length);
    expect(isValidMetaSignature(SECRET, body, `sha1=${digest}`)).toBe(false);
  });

  it("rejects a header with no digest", () => {
    expect(isValidMetaSignature(SECRET, body, "sha256=")).toBe(false);
  });

  /**
   * The reason the route reads the body as text rather than as JSON: the same
   * object re-serialized with different key order is a different byte string,
   * and Meta signed the bytes it sent.
   */
  it("fails when the body was re-serialized rather than passed through", () => {
    const header = sign(body);
    const reserialized = JSON.stringify(JSON.parse(body), ["entry", "object"]);
    expect(reserialized).not.toBe(body);
    expect(isValidMetaSignature(SECRET, reserialized, header)).toBe(false);
  });
});

describe("verifyChallenge", () => {
  const token = "my-verify-token";

  function params(entries: Record<string, string>): URLSearchParams {
    return new URLSearchParams(entries);
  }

  it("returns the challenge for a genuine subscribe request", () => {
    expect(
      verifyChallenge(
        token,
        params({
          "hub.mode": "subscribe",
          "hub.verify_token": token,
          "hub.challenge": "1158201444",
        }),
      ),
    ).toEqual({ ok: true, challenge: "1158201444" });
  });

  /*
   * Each rejection names its own cause. Meta stops delivering messages to a
   * callback it can't verify, so an unexplained 403 here silently disables a
   * working integration — the failure that cost a day of debugging.
   */
  it("rejects a wrong verify token and says so", () => {
    const result = verifyChallenge(
      token,
      params({
        "hub.mode": "subscribe",
        "hub.verify_token": "not-the-tokn",
        "hub.challenge": "1158201444",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(
      /does not match META_WEBHOOK_VERIFY_TOKEN/,
    );
  });

  it("reports both lengths, so a truncated paste is obvious", () => {
    const result = verifyChallenge(
      token,
      params({
        "hub.mode": "subscribe",
        "hub.verify_token": "short",
        "hub.challenge": "1158201444",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(
      `expected ${token.length} chars, received 5`,
    );
  });

  /** The token itself must never reach a log line. */
  it("never puts either token value in the reason", () => {
    const result = verifyChallenge(
      token,
      params({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token!",
        "hub.challenge": "1158201444",
      }),
    );
    expect(result.ok === false && result.reason).not.toContain(token);
    expect(result.ok === false && result.reason).not.toContain("wrong-token!");
  });

  it("rejects a mode other than subscribe", () => {
    const result = verifyChallenge(
      token,
      params({
        "hub.mode": "unsubscribe",
        "hub.verify_token": token,
        "hub.challenge": "1158201444",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("unsubscribe");
  });

  /** Crawlers and browsers hitting a public URL — noise, not a broken setup. */
  it("distinguishes ordinary GET traffic from a failed handshake", () => {
    const result = verifyChallenge(token, params({}));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(
      "ordinary GET traffic",
    );
  });

  it("rejects a request with no challenge to echo", () => {
    const result = verifyChallenge(
      token,
      params({ "hub.mode": "subscribe", "hub.verify_token": token }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("hub.challenge");
  });

  it("rejects a request with no verify token", () => {
    const result = verifyChallenge(
      token,
      params({ "hub.mode": "subscribe", "hub.challenge": "1158201444" }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("hub.verify_token");
  });
});
