/**
 * CSS-safe handling of image URLs.
 *
 * Owner/CMS-supplied image URLs are interpolated into inline `background-image`
 * styles. A value containing `')`, quotes, or parentheses could break out of
 * `url(...)` and inject arbitrary CSS into the tenant's page. These helpers
 * neutralize that at render time (existing data included).
 */

/** Allow only http(s) or root-relative URLs with no CSS-breakout characters. */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Reject quotes, parentheses, backslash, angle brackets, and whitespace.
  if (/["'()\\<>\s]/.test(trimmed)) return false;
  return /^(https?:\/\/|\/)/i.test(trimmed);
}

/** A single `url("…")` CSS layer, or null when the URL is unsafe/absent. */
export function imageLayer(url: string | null | undefined): string | null {
  return isSafeImageUrl(url) ? `url("${(url as string).trim()}")` : null;
}

/**
 * Compose a CSS `background-image` value from layers (gradients, `url(...)`),
 * dropping any empty/unsafe ones. Returns `none` when nothing valid remains, so
 * the property is always syntactically valid.
 */
export function backgroundImage(
  ...layers: (string | null | undefined)[]
): string {
  const valid = layers.filter((l): l is string => Boolean(l && l.trim()));
  return valid.length ? valid.join(", ") : "none";
}
