/**
 * Fetching a tenant's logo for the Open Graph card.
 *
 * Satori will happily take a remote `<img src>` and fetch it itself, but then a
 * slow or broken logo becomes a failed CARD — and the caller has no way to fall
 * back, because the failure happens deep inside the rasteriser. Fetching here
 * instead means a bad logo degrades to the initial tile, which is the same
 * fallback the favicon already uses (lib/tenant/icons.ts).
 *
 * The URL comes from tenant-editable data, so this is also the place the
 * request has to be constrained.
 */

/** Satori rasterises these. SVG is excluded — it renders inconsistently. */
const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** A crawler is waiting. Better a tile than a timeout. */
const TIMEOUT_MS = 2500;

/** Guard against a logo large enough to blow the function's memory. */
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * The logo as a data URI, or null when it cannot be used.
 *
 * Never throws and never rejects: every failure path returns null so the card
 * falls back rather than 500s on a route search engines and chat apps hit.
 */
export async function fetchLogoDataUri(
  logoUrl: string | null | undefined,
): Promise<string | null> {
  if (!logoUrl) return null;

  let url: URL;
  try {
    url = new URL(logoUrl);
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
