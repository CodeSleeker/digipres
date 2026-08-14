import { describe, expect, it } from "vitest";
import {
  TokenCryptoError,
  decryptPageToken,
  encryptPageToken,
  tokenCryptoConfigured,
} from "@/lib/messenger/token-crypto";

const ENV = {
  MESSENGER_TOKEN_ENCRYPTION_KEY: "a".repeat(40),
};
const TOKEN = "EAAG...a-real-looking-page-access-token";

describe("page token encryption", () => {
  it("round-trips a token", () => {
    const stored = encryptPageToken(TOKEN, ENV);
    expect(decryptPageToken(stored, ENV)).toBe(TOKEN);
  });

  it("never stores the plaintext", () => {
    const stored = encryptPageToken(TOKEN, ENV);
    expect(stored).not.toContain(TOKEN);
    expect(stored).not.toContain("a-real-looking");
  });

  /** A fresh IV per call, so the same token twice is not the same ciphertext. */
  it("produces a different ciphertext each time", () => {
    expect(encryptPageToken(TOKEN, ENV)).not.toBe(
      encryptPageToken(TOKEN, ENV),
    );
  });

  it("is versioned so the scheme can change later", () => {
    expect(encryptPageToken(TOKEN, ENV).startsWith("v1:")).toBe(true);
  });

  /**
   * The reason for GCM over CBC: a tampered ciphertext must fail loudly rather
   * than decrypt to garbage that would then be sent to Meta as a bearer token.
   */
  it("refuses a tampered ciphertext", () => {
    const stored = encryptPageToken(TOKEN, ENV);
    const parts = stored.split(":");
    parts[3] = Buffer.from("tampered-payload").toString("base64url");
    expect(() => decryptPageToken(parts.join(":"), ENV)).toThrow(
      TokenCryptoError,
    );
  });

  it("refuses a tampered auth tag", () => {
    const parts = encryptPageToken(TOKEN, ENV).split(":");
    parts[2] = Buffer.from("0".repeat(16)).toString("base64url");
    expect(() => decryptPageToken(parts.join(":"), ENV)).toThrow(
      TokenCryptoError,
    );
  });

  it("refuses a value from a different key", () => {
    const stored = encryptPageToken(TOKEN, ENV);
    expect(() =>
      decryptPageToken(stored, {
        MESSENGER_TOKEN_ENCRYPTION_KEY: "b".repeat(40),
      }),
    ).toThrow(TokenCryptoError);
  });

  it("refuses a malformed stored value", () => {
    for (const bad of ["", "nonsense", "v1:only:three", "v2:a:b:c"]) {
      expect(() => decryptPageToken(bad, ENV)).toThrow(TokenCryptoError);
    }
  });

  describe("configuration", () => {
    it("refuses to encrypt with no key set", () => {
      expect(() => encryptPageToken(TOKEN, {})).toThrow(TokenCryptoError);
    });

    it("refuses a key short enough to be brute-forced", () => {
      expect(() =>
        encryptPageToken(TOKEN, { MESSENGER_TOKEN_ENCRYPTION_KEY: "short" }),
      ).toThrow(/at least 32 characters/);
    });

    it("refuses to encrypt an empty token", () => {
      expect(() => encryptPageToken("   ", ENV)).toThrow(TokenCryptoError);
    });

    it("reports whether storage is usable without throwing", () => {
      expect(tokenCryptoConfigured(ENV)).toBe(true);
      expect(tokenCryptoConfigured({})).toBe(false);
      expect(
        tokenCryptoConfigured({ MESSENGER_TOKEN_ENCRYPTION_KEY: "short" }),
      ).toBe(false);
    });
  });
});
