import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";

/**
 * Encryption for Page Access Tokens at rest.
 *
 * A Page token is the ability to post as somebody's business. It cannot sit in
 * a column in plaintext, and it cannot be an environment variable either —
 * there is one per client, issued and revoked independently.
 *
 * AES-256-GCM rather than AES-CBC: GCM authenticates as well as encrypts, so a
 * tampered ciphertext fails to decrypt instead of yielding plausible garbage
 * that would then be sent to Meta as a bearer token.
 *
 * The key lives only in `MESSENGER_TOKEN_ENCRYPTION_KEY`, so a database dump on
 * its own is not enough to impersonate a client's Page.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96 bits, the size GCM is defined for
const VERSION = "v1";

export class TokenCryptoError extends Error {}

/**
 * A 32-byte key from the configured secret.
 *
 * SHA-256 of the raw value, so any length of secret works and the operator is
 * not asked to produce exactly 32 bytes of base64 by hand — a requirement met
 * by truncating or padding, which is how key material quietly loses entropy.
 */
function key(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf-8").digest();
}

function secretFromEnv(
  env: Record<string, string | undefined> = process.env,
): string {
  const value = env.MESSENGER_TOKEN_ENCRYPTION_KEY?.trim();
  if (!value) {
    throw new TokenCryptoError(
      "MESSENGER_TOKEN_ENCRYPTION_KEY is not set — Page tokens cannot be stored.",
    );
  }
  // Short keys are a footgun, and the failure is silent: everything works until
  // someone tries to brute-force it. Refuse rather than warn.
  if (value.length < 32) {
    throw new TokenCryptoError(
      "MESSENGER_TOKEN_ENCRYPTION_KEY must be at least 32 characters.",
    );
  }
  return value;
}

/**
 * `v1:<iv>:<tag>:<ciphertext>`, all base64url.
 *
 * The version prefix is what makes rotating the algorithm possible later
 * without guessing at the shape of rows already written.
 */
export function encryptPageToken(
  plaintext: string,
  env?: Record<string, string | undefined>,
): string {
  if (!plaintext.trim()) {
    throw new TokenCryptoError("Refusing to encrypt an empty token.");
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(secretFromEnv(env)), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/**
 * Reverse of `encryptPageToken`. Throws on a tampered or truncated value rather
 * than returning something that looks like a token.
 */
export function decryptPageToken(
  stored: string,
  env?: Record<string, string | undefined>,
): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new TokenCryptoError("Stored token is not in the expected format.");
  }

  const [, ivPart, tagPart, dataPart] = parts;
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key(secretFromEnv(env)),
      Buffer.from(ivPart!, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart!, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart!, "base64url")),
      decipher.final(),
    ]).toString("utf-8");
  } catch (error) {
    // The underlying message ("unable to authenticate data") says nothing
    // useful to a caller and everything useful to an attacker probing the
    // endpoint that surfaced it.
    if (error instanceof TokenCryptoError) throw error;
    throw new TokenCryptoError("Could not decrypt the stored Page token.");
  }
}

/** Whether token storage is usable, for a config check that must not throw. */
export function tokenCryptoConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  try {
    secretFromEnv(env);
    return true;
  } catch {
    return false;
  }
}
