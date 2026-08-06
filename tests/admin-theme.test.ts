import { describe, it, expect } from "vitest";
import { adminTheme } from "@/lib/admin/theme";
import { TEMPLATES } from "@/templates/registry";
import { themePalette } from "@/templates/themes";

/**
 * The back office takes its colours from the tenant's theme, which means a
 * palette designed for a WEBSITE now has to hold up as application chrome.
 * These are the ratios that decide whether it does — and every one of them
 * fails silently: an unreadable button still renders, still clicks, and still
 * looks fine to whoever picked the colours on a good monitor.
 *
 * Run for every registered template, so adding one cannot ship a dashboard
 * nobody can read.
 */

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const CASES = TEMPLATES.flatMap((template) =>
  template.themes.map((theme) => ({
    code: template.code,
    theme: theme.code,
    label: `${template.code}:${theme.code}`,
  })),
);

describe.each(CASES)("admin theme — $label", ({ code, theme }) => {
  const palette = themePalette(code, theme);
  const { style, dark } = adminTheme(code, theme);
  const vars = style as Record<string, string>;

  it("draws readable text on the accent fill", () => {
    // The Save button. Black on gold, white on deep mint — chosen, not stored,
    // so this is the only thing checking the choice was right.
    expect(contrast(vars["--admin-on-accent"]!, palette.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps body and muted text legible on both the page and a panel", () => {
    // `text-admin-muted` is the most-used colour in the whole dashboard, and it
    // sits on two grounds — the page and the cards. The panel is the tighter of
    // the two, and the one nobody thinks to check.
    for (const ground of [palette.background, palette.surface]) {
      expect(contrast(palette.foreground, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.muted, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("shows the accent against the surfaces it labels", () => {
    // Headings, links and the active nav item. 3:1 is the large-text floor;
    // these are set at heading sizes or as UI affordances.
    for (const ground of [palette.background, palette.surface]) {
      expect(contrast(palette.accent, ground)).toBeGreaterThanOrEqual(3);
    }
  });

  it("classifies the palette so native controls follow it", () => {
    // A light dashboard with `color-scheme: dark` grows a black date picker.
    expect(dark).toBe(luminance(palette.background) < 0.4);
  });

  it("hands the shadcn primitives the same palette", () => {
    // Button, Input and Select read these; leaving them at the :root defaults
    // is what made every tenant's form gold on black.
    expect(vars["--background"]).toBe(palette.background);
    expect(vars["--primary"]).toBe(palette.accent);
    expect(vars["--primary-foreground"]).toBe(vars["--admin-on-accent"]);
    expect(vars["--border"]).toBe(palette.border);
  });
});

describe("admin theme — fallback", () => {
  it("renders the platform's own palette for an unknown template", () => {
    // A bad template_code must not leave an operator with an unstyled page.
    const { style, dark } = adminTheme("does-not-exist", null);
    const vars = style as Record<string, string>;
    expect(vars["--admin-bg"]).toBeTruthy();
    expect(vars["--admin-accent"]).toBeTruthy();
    expect(dark).toBe(true);
  });
});
