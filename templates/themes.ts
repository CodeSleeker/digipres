/**
 * Theme palettes in plain values, for renderers that cannot read CSS.
 *
 * WHY THIS DUPLICATES app/globals.css
 *
 * The templates get their colours from CSS custom properties, which is right —
 * the browser resolves them. But the Open Graph card is rasterised by Satori
 * (next/og), which has no CSS engine, no custom properties and no stylesheet.
 * It needs literal hex. There is no way to share one source between the two, so
 * the values are mirrored here deliberately rather than by accident.
 *
 * KEEP IN SYNC with the `@theme` block in app/globals.css. If a colour changes
 * there and not here, the only symptom is a share card that looks slightly off
 * — nothing breaks, so nothing tells you.
 *
 * Keyed by template AND theme because a theme code is only meaningful within
 * its template: "default" means gold-on-black under barber-luxury and would
 * mean something else under a clinic template.
 */

export interface ThemePalette {
  /** Card background. */
  background: string;
  /** Primary text. Must be legible on `background`. */
  foreground: string;
  /** Secondary text — the locality line. */
  muted: string;
  /** Brand accent: the rule, and the initial in the fallback tile. */
  accent: string;
  /** Panel behind the logo or initial, a step off the background. */
  surface: string;
  /** Hairline. */
  border: string;
}

/**
 * Gold on black — the only theme that exists today, and the fallback for any
 * template/theme pair that has not been given one.
 *
 * Values are from the `@theme` block in app/globals.css:
 *   black #0a0a0a · dark-card #1e1e1e · dark-border #2a2a2a
 *   gold #c9a96e · white #f5f5f5 · gray-light #aaaaaa
 */
const GOLD_ON_BLACK: ThemePalette = {
  background: "#0a0a0a",
  foreground: "#f5f5f5",
  muted: "#aaaaaa",
  accent: "#c9a96e",
  surface: "#1e1e1e",
  border: "#2a2a2a",
};

/**
 * Paper and mint — the patisserie/boutique theme.
 *
 * `accent` is the DEEP mint rather than the logo's soft mint: on the card the
 * accent is a rule and an initial drawn on near-white, and the full-strength
 * hue measures under 2:1 there. Same reasoning as the template's own tokens.
 *
 * Values are from the `@theme` block in app/globals.css:
 *   paper #fffdf8 · beige #f6efe6 · ink #2f2a26 · ink-45 #736a62
 *   mint-deep #237c6c
 */
const PAPER_AND_MINT: ThemePalette = {
  background: "#fffdf8",
  foreground: "#2f2a26",
  muted: "#736a62",
  accent: "#237c6c",
  surface: "#f6efe6",
  border: "#ede3d6",
};

/** `${templateCode}:${themeCode}` → palette. */
const PALETTES: Record<string, ThemePalette> = {
  "barber-luxury:default": GOLD_ON_BLACK,
  "patisserie-boutique:default": PAPER_AND_MINT,
};

/**
 * The palette for a tenant's template + theme.
 *
 * Falls back rather than throwing: a share card is decoration, and a tenant on
 * a newly added theme should get a plausible card rather than a 500 on a route
 * that crawlers hit.
 */
export function themePalette(
  templateCode: string | null | undefined,
  themeCode: string | null | undefined,
): ThemePalette {
  return (
    PALETTES[`${templateCode ?? ""}:${themeCode ?? ""}`] ?? GOLD_ON_BLACK
  );
}

/** Exported for the test that proves every registered template has a palette. */
export const PALETTE_KEYS = Object.keys(PALETTES);
