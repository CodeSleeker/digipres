import type { CSSProperties } from "react";
import { themePalette, themeHeadingFont } from "@/templates/themes";

/**
 * The back office wears the tenant's colours.
 *
 * A client's dashboard used to be gold-on-black whatever their site looked
 * like, because the admin was written when the barber template was the only
 * one and its palette WAS the app's palette. That reads as someone else's tool
 * to every tenant on any other template.
 *
 * The colours come from the SAME `ThemePalette` the share cards use, rather
 * than a second set anyone could let drift — so a theme is defined once and the
 * public site, the Open Graph card and the dashboard cannot disagree.
 *
 * Two things are derived rather than stored:
 *
 *  - `--admin-on-accent`, the text drawn ON the accent fill. Black on gold and
 *    white on deep mint, chosen by luminance. Storing it would be one more
 *    value to keep in sync with a colour it is entirely determined by.
 *  - light vs dark, which sets `color-scheme` so native controls — date
 *    pickers, dropdowns, scrollbars — match. Without it a light dashboard grows
 *    a black date picker the moment someone books an appointment.
 *
 * Everything else is expressed with `color-mix()` in the stylesheet, so a
 * hover state or a field background adapts to any future palette instead of
 * needing a value invented for it here.
 */
export interface AdminTheme {
  /** Inline custom properties for the shell element. */
  style: CSSProperties;
  /** Drives `color-scheme` and the `data-admin-dark` hook. */
  dark: boolean;
}

export function adminTheme(
  templateCode: string | null | undefined,
  themeCode: string | null | undefined,
): AdminTheme {
  const palette = themePalette(templateCode, themeCode);
  const dark = isDark(palette.background);
  const onAccent = readableOn(palette.accent);

  return {
    dark,
    style: {
      // The back-office tokens (bg-admin, text-admin-accent, …).
      "--admin-bg": palette.background,
      "--admin-panel": palette.surface,
      "--admin-line": palette.border,
      "--admin-fg": palette.foreground,
      "--admin-muted": palette.muted,
      "--admin-accent": palette.accent,
      "--admin-on-accent": onAccent,
      "--admin-font-heading": themeHeadingFont(templateCode, themeCode),

      /*
       * The shadcn token layer, pointed at the same palette.
       *
       * Set here rather than restyling each primitive: Button, Input, Label,
       * Select and Textarea all read these, so overriding them on the shell is
       * what makes an off-the-shelf component follow the tenant instead of the
       * :root defaults in globals.css (which are, and remain, the barber's).
       */
      "--background": palette.background,
      "--foreground": palette.foreground,
      "--card": palette.surface,
      "--card-foreground": palette.foreground,
      "--popover": palette.surface,
      "--popover-foreground": palette.foreground,
      "--primary": palette.accent,
      "--primary-foreground": onAccent,
      "--secondary": palette.surface,
      "--secondary-foreground": palette.foreground,
      "--muted": palette.surface,
      "--muted-foreground": palette.muted,
      "--accent": palette.surface,
      "--accent-foreground": palette.accent,
      "--border": palette.border,
      "--input": palette.border,
      "--ring": palette.accent,
    } as CSSProperties,
  };
}

/** Relative luminance (WCAG). Accepts `#rrggbb`. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function isDark(background: string): boolean {
  return luminance(background) < 0.4;
}

/**
 * Black or white, whichever is more readable on this fill.
 *
 * 0.179 is the luminance at which the two contrast ratios cross — above it
 * black wins, below it white does. Not a rounded guess: it is the exact
 * solution to (L+0.05)/0.05 = 1.05/(L+0.05).
 */
function readableOn(fill: string): string {
  return luminance(fill) > 0.179 ? "#0a0a0a" : "#ffffff";
}
