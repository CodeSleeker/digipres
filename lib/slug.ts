/**
 * Normalize arbitrary text into a URL-safe slug:
 * lowercase, spaces/underscores → hyphens, strip non-alphanumerics, collapse
 * and trim hyphens. e.g. "Ronie's Barber Shop" → "ronies-barber-shop".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "") // drop apostrophes rather than hyphenate them
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Matches a valid stored slug: lowercase alphanumerics separated by hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
