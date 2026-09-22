/**
 * Fetching a tenant's images for the Open Graph card — their logo, and the
 * photograph the card is built on.
 *
 * Satori will happily take a remote `<img src>` and fetch it itself, but then a
 * slow or broken image becomes a failed CARD — and the caller has no way to
 * fall back, because the failure happens deep inside the rasteriser. Fetching
 * here instead means a bad image degrades to the plain card, the same way a bad
 * logo degrades to the initial tile the favicon already uses
 * (lib/tenant/icons.ts).
 *
 * BOTH URLs come from tenant-editable data — an owner can paste either into the
 * CMS — so this is the one place the request has to be constrained, and the
 * constraints below are the reason this is a function rather than an `<img>`.
 */

/** Satori rasterises these. SVG is excluded — it renders inconsistently. */
const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** A crawler is waiting. Better a plain card than a timeout. */
const TIMEOUT_MS = 2500;

/** Guard against an image large enough to blow the function's memory. */
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * The image as a data URI, or null when it cannot be used.
 *
 * Never throws and never rejects: every failure path returns null so the card
 * falls back rather than 500s on a route search engines and chat apps hit.
 */
export async function fetchCardImage(
  source: string | null | undefined,
): Promise<string | null> {
  if (!source) return null;

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null; // relative or malformed — nothing to fetch
  }

  // Only https. The value is tenant-supplied, and this fetch runs server-side
  // with the platform's own network position: http:// would be downgradeable,
  // and other schemes (file:, data:) have no business reaching this code.
  if (url.protocol !== "https:") return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // The card is regenerated rarely; let the platform cache do the work.
      cache: "force-cache",
    });
    if (!response.ok) return null;

    const type = (response.headers.get("content-type") ?? "")
      .split(";")[0]!
      .trim()
      .toLowerCase();
    if (!RASTER_TYPES.has(type)) return null;

    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return null;

    const buffer = await response.arrayBuffer();
    // Re-check: content-length is a hint, not a promise.
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;

    return `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    // Timeout, DNS, TLS, aborted — all the same to the caller.
    return null;
  }
}

/**
 * The photograph the share card is built on, or null for the plain card.
 *
 * `hero.card.image` first, then `hero.image`: that is the order the hero
 * itself renders them, so the card shows the picture a visitor would see at
 * the top of the page rather than a backdrop they would not recognise.
 *
 * Null is a real answer, not a failure. The barber's hero is a scrubbed frame
 * sequence with no still behind it, so that template has no photograph to
 * offer and keeps the typographic card it has always had.
 */
export function cardPhoto(
  profile: { hero: { image?: string; card?: { image: string } } } | null,
): string | null {
  const hero = profile?.hero;
  return hero?.card?.image || hero?.image || null;
}
