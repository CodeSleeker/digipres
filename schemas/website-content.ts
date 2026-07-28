import { z } from "zod";
import type { WebsiteSection } from "@/types/website-content";
import { isSafeImageUrl } from "@/lib/security/css";

/**
 * Validation for the Website CMS. Each section schema mirrors the stored JSONB
 * shape (types/website-content.ts) and is re-run on the server for every save —
 * client validation is never trusted.
 */

const text = z.string().trim();
const requiredText = (msg: string) => z.string().trim().min(1, msg);

// A newline-separated list of strings, trimmed with blanks removed.
const requiredStringList = (msg: string) =>
  z
    .array(z.string())
    .transform((items) => items.map((s) => s.trim()).filter(Boolean))
    .refine((items) => items.length >= 1, { message: msg });

const optionalStringList = (max: number) =>
  z
    .array(z.string())
    .transform((items) => items.map((s) => s.trim()).filter(Boolean))
    .refine((items) => items.length <= max, {
      message: `Add at most ${max}.`,
    });
// Allow relative anchors (#services), tel:, mailto:, and absolute URLs.
const link = z.string().trim().min(1, "Link is required.").max(2048);
// Image URL: http(s) or a root-relative path, and safe to place inside a CSS
// url(...) — no quotes/parens/whitespace that could break out (see lib/security/css).
const imageRef = z
  .string()
  .trim()
  .min(1, "Image URL is required.")
  .max(2048)
  .refine(isSafeImageUrl, "Enter a valid image URL (https://… or /path).");

const ctaSchema = z.object({
  label: requiredText("Button label is required."),
  href: link,
  arrow: z.boolean().optional(),
});

const headingSchema = z.object({
  label: requiredText("Eyebrow label is required."),
  title: requiredText("Title is required."),
  subtitle: text.max(300).optional(),
});

// ── Hero ─────────────────────────────────────────────────────────────────────
export const heroSchema = z.object({
  overline: requiredText("Overline is required."),
  titleLines: z
    .array(
      z.object({
        text: requiredText("Line text is required."),
        stroke: z.boolean().optional(),
      }),
    )
    .min(1, "Add at least one title line."),
  description: requiredText("Description is required."),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema,
  stats: z
    .array(
      z.object({
        value: requiredText("Value is required."),
        label: requiredText("Label is required."),
      }),
    )
    .max(6),
  backgroundImage: imageRef,
});

// ── About ────────────────────────────────────────────────────────────────────
export const aboutSchema = z.object({
  label: requiredText("Eyebrow label is required."),
  titleLines: requiredStringList("Add at least one title line."),
  text: requiredText("Body text is required."),
  features: optionalStringList(12),
  cta: ctaSchema,
  image: imageRef,
  badgeValue: requiredText("Badge value is required."),
  badgeLabel: requiredText("Badge label is required."),
});

// ── Services ─────────────────────────────────────────────────────────────────
export const servicesSchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z.object({
        icon: requiredText("Icon is required."),
        title: requiredText("Title is required."),
        description: requiredText("Description is required."),
        price: requiredText("Price is required."),
        unit: text.max(40),
      }),
    )
    .min(1, "Add at least one service."),
});

// ── Gallery ──────────────────────────────────────────────────────────────────
export const gallerySchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z.object({
        title: requiredText("Title is required."),
        by: text.max(120),
        image: imageRef,
        wide: z.boolean().optional(),
      }),
    )
    .min(1, "Add at least one gallery item."),
});

// ── Contact (section-specific extras only) ───────────────────────────────────
const bookingOptionSchema = z.object({
  label: requiredText("Option label is required."),
  value: text.optional(),
});

export const contactSchema = z.object({
  label: requiredText("Eyebrow label is required."),
  titleLines: requiredStringList("Add at least one title line."),
  intro: requiredText("Intro is required."),
  serviceOptions: z.array(bookingOptionSchema),
  barberOptions: z.array(bookingOptionSchema),
});

// ── Footer (section-specific extras only) ────────────────────────────────────
export const footerSchema = z.object({
  description: requiredText("Description is required."),
  columns: z
    .array(
      z.object({
        title: requiredText("Column title is required."),
        links: z.array(
          z.object({
            label: requiredText("Link label is required."),
            href: link,
          }),
        ),
      }),
    )
    .max(6),
  copyright: requiredText("Copyright is required."),
  credit: text.max(200),
});

/** Section name → its schema, for the generic save action. */
export const SECTION_SCHEMA = {
  hero: heroSchema,
  about: aboutSchema,
  services: servicesSchema,
  gallery: gallerySchema,
  contact: contactSchema,
  footer: footerSchema,
} satisfies Record<WebsiteSection, z.ZodTypeAny>;

export type HeroFormValues = z.infer<typeof heroSchema>;
export type AboutFormValues = z.infer<typeof aboutSchema>;
export type ServicesFormValues = z.infer<typeof servicesSchema>;
export type GalleryFormValues = z.infer<typeof gallerySchema>;
export type ContactFormValues = z.infer<typeof contactSchema>;
export type FooterFormValues = z.infer<typeof footerSchema>;
