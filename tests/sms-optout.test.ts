import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { toE164, isE164 } from "@/lib/sms/phone";
import { isValidTwilioSignature } from "@/lib/sms/twilio-signature";

describe("E.164 normalization", () => {
  it("keeps already-international numbers and strips formatting", () => {
    expect(toE164("+63 917 123 4567")).toBe("+639171234567");
    expect(toE164("+1 (555) 123-4567")).toBe("+15551234567");
  });

  it("converts 00-international prefix to +", () => {
    expect(toE164("0063917123 4567")).toBe("+639171234567");
  });

  it("internationalizes a national number using the default calling code", () => {
    expect(toE164("0917 123 4567", "63")).toBe("+639171234567");
    expect(toE164("(0917) 123-4567", "63")).toBe("+639171234567");
  });

  it("returns null for a national number with no default calling code", () => {
    expect(toE164("0917 123 4567", undefined)).toBeNull();
  });

  it("returns null for junk", () => {
    expect(toE164("not a phone")).toBeNull();
    expect(toE164("")).toBeNull();
  });

  it("isE164 validates shape", () => {
    expect(isE164("+639171234567")).toBe(true);
    expect(isE164("09171234567")).toBe(false);
    expect(isE164("+0123")).toBe(false);
    expect(isE164(null)).toBe(false);
  });
});

describe("Twilio signature validation", () => {
  const token = "test-auth-token";
  const url = "https://app.example.com/api/sms/inbound";
  const params = { From: "+639171234567", To: "+15551110000", Body: "STOP" };

  function sign(u: string, p: Record<string, string>): string {
    const data =
      u +
      Object.keys(p)
        .sort()
        .map((k) => k + p[k])
        .join("");
    return createHmac("sha1", token)
      .update(Buffer.from(data, "utf-8"))
      .digest("base64");
  }

  it("accepts a correctly signed request", () => {
    expect(isValidTwilioSignature(token, url, params, sign(url, params))).toBe(
      true,
    );
  });

  it("rejects a tampered body", () => {
    const sig = sign(url, params);
    expect(
      isValidTwilioSignature(token, url, { ...params, Body: "YES" }, sig),
    ).toBe(false);
  });

  it("rejects a missing or bad signature", () => {
    expect(isValidTwilioSignature(token, url, params, null)).toBe(false);
    expect(isValidTwilioSignature(token, url, params, "deadbeef")).toBe(false);
  });
});
