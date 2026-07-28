/**
 * Phone-number helpers for SMS. Deliberately dependency-free and pragmatic for a
 * single default region (configurable via SMS_DEFAULT_COUNTRY_CODE). For strict
 * multi-country parsing, swap in libphonenumber-js behind `toE164` later.
 */

/** Loose E.164 check: '+' then 8–15 digits, first digit non-zero. */
export function isE164(value: string | null | undefined): boolean {
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
}

/**
 * Best-effort normalization to E.164. Handles:
 *  - already international: `+63…` or `0063…` (→ `+63…`)
 *  - national with trunk 0: `0917…` (+ default calling code → `+63917…`)
 *  - bare digits: prefixed with the default calling code
 *
 * Returns null when it can't produce a confident E.164 value (e.g. a national
 * number with no default calling code configured).
 *
 * @param defaultCallingCode digits only, e.g. "63" (Philippines). Defaults to
 *   SMS_DEFAULT_COUNTRY_CODE.
 */
export function toE164(
  raw: string,
  defaultCallingCode: string | undefined = process.env
    .SMS_DEFAULT_COUNTRY_CODE,
): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    return /^[1-9]\d{7,14}$/.test(digits) ? "+" + digits : null;
  }

  const cc = (defaultCallingCode ?? "").replace(/\D/g, "");
  if (!cc) return null; // can't internationalize a national number without one

  const national = s.replace(/\D/g, "").replace(/^0+/, ""); // drop trunk prefix
  const candidate = cc + national;
  return /^[1-9]\d{7,14}$/.test(candidate) ? "+" + candidate : null;
}
