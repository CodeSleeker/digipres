import type { Metadata } from "next";

/**
 * The browser-tab icon for a tenant's public site.
 *
 * Why this exists at all: `app/icon.*` file conventions apply to EVERY route in
 * the app, and file-based metadata outranks the `icons` config field — so a
 * platform icon placed there would put the agency's mark in every client's tab
 * with no way for the client's own page to override it. The platform icons are
 * therefore declared as config in the root layout (public/brand/*), which a
 * deeper `generateMetadata` is free to replace. This builds that replacement.
 *
 * Resolution order:
 *   1. `faviconUrl` — a square mark the owner uploaded specifically for this,
 *   2. `logoUrl` — better the real logo, cropped by the browser, than someone
 *      else's brand,
 *   3. a tile generated from the wordmark initial, so a tenant who has uploaded
 *      nothing still gets an icon that is recognisably theirs.
 */
export function tenantIcons(
  business: { faviconUrl: string | null; logoUrl: string | null },
  initial: string,
): Metadata["icons"] {
  const uploaded = business.faviconUrl ?? business.logoUrl;

  if (uploaded) {
    return {
      icon: [{ url: uploaded }],
      // iOS renders this at 180px on a home screen. An uploaded raster is a
      // reasonable source; the generated SVG below is not (iOS ignores SVG
      // apple-touch-icons), so the fallback branch omits it.
      apple: [{ url: uploaded }],
    };
  }

  return {
    icon: [{ url: generatedIconHref(initial), type: "image/svg+xml" }],
  };
}

/**
 * URL of the generated initial tile. The initial is part of the path query, so
 * the response is content-addressed and can be cached indefinitely — renaming
 * the business changes the URL rather than serving a stale icon.
 */
export function generatedIconHref(initial: string): string {
  return `/api/brand-icon?initial=${encodeURIComponent(iconInitial(initial))}`;
}

/**
 * Reduce arbitrary text to the one or two characters the tile can show.
 *
 * This is an ALLOW-LIST, not an escape: the result is interpolated into an SVG
 * document, and permitting only letters and digits means there is no `<` or `&`
 * left to break out with, whatever the business name contains. Non-Latin
 * scripts pass through — `\p{L}` is Unicode-aware — and a name made entirely of
 * punctuation or emoji falls back to a neutral dot rather than an empty tile.
 */
export function iconInitial(raw: string): string {
  const letters = Array.from(raw.trim().toUpperCase()).filter((char) =>
    /\p{L}|\p{N}/u.test(char),
  );
  return letters.slice(0, 2).join("") || "•";
}
