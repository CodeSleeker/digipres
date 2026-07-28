import type { ComponentType } from "react";
import type { BusinessProfile } from "@/types/business";

/**
 * Available website templates and themes.
 *
 * The registry lives in code because the React components do. A business stores
 * only the CODES (businesses.template_code / theme_code); this is the list those
 * codes are validated against, the source for pickers in the UI, and — via
 * `loadTemplate` — what the public render path resolves.
 *
 * TO ADD A TEMPLATE:
 *   1. templates/<industry>/html/<name>.html   (approved visual source)
 *   2. templates/<industry>/<name>/            (React conversion)
 *   3. a default profile (the merge base for un-customized tenants)
 *   4. an entry in TEMPLATES + a case in loadTemplate()
 *
 * Every template currently receives the same `BusinessProfile`. When industries
 * diverge enough to need their own section shapes, add a `contentSchema` to
 * TemplateDefinition and drive the CMS from it — that's the intended seam.
 */
export interface ThemeOption {
  code: string;
  name: string;
}

export interface TemplateOption {
  code: string;
  name: string;
  /** Maps to the business_category enum where one exists. */
  industry: string;
  description: string;
  themes: ThemeOption[];
}

export const TEMPLATES: TemplateOption[] = [
  {
    code: "barber-luxury",
    name: "Barber — Luxury",
    industry: "barber",
    description:
      "Dark, gold-accented single page: hero, craft, services, gallery, team, contact.",
    themes: [{ code: "default", name: "Gold on Black" }],
  },
];

export const DEFAULT_TEMPLATE_CODE = "barber-luxury";
export const DEFAULT_THEME_CODE = "default";

export function findTemplate(code: string): TemplateOption | null {
  return TEMPLATES.find((t) => t.code === code) ?? null;
}

/** A resolved template: the component to render and its default content. */
export interface TemplateDefinition {
  code: string;
  Component: ComponentType<{ business: BusinessProfile }>;
  /** Merge base for a tenant that hasn't customized a section yet. */
  defaultProfile: BusinessProfile;
}

/**
 * Resolve a template code to its component + defaults.
 *
 * Uses dynamic imports so a tenant only downloads the template it actually
 * uses. An unknown code falls back to the default template rather than failing
 * the page — a bad column value must never take a customer's site down.
 */
export async function loadTemplate(
  code: string | null | undefined,
): Promise<TemplateDefinition> {
  switch (code) {
    case "barber-luxury":
    default: {
      const [{ LuxuryBarberTemplate }, { ronies }] = await Promise.all([
        import("./barber/luxury"),
        import("@/lib/businesses/ronies"),
      ]);
      return {
        code: "barber-luxury",
        Component: LuxuryBarberTemplate,
        defaultProfile: ronies,
      };
    }
  }
}

export function isValidTemplate(code: string): boolean {
  return findTemplate(code) !== null;
}

/** True when the theme exists for that template. */
export function isValidTheme(templateCode: string, themeCode: string): boolean {
  const template = findTemplate(templateCode);
  return template ? template.themes.some((t) => t.code === themeCode) : false;
}
