import { z } from "zod";
import type { WebsiteSection } from "@/types/website-content";
import { isSafeImageUrl } from "@/lib/security/css";
import { isSafeVideoUrl } from "@/lib/security/media";

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

/**
 * An optional public profile link. https-only and empty-normalised: these land
 * directly in an `<a href>` on the live site, so anything that could carry a
 * javascript:/data: payload has to be refused HERE — the template renders what
 * it is given.
 */
const optionalProfileUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === "" || /^https:\/\/[^\s]+$/i.test(value),
    "Enter an https:// link, or leave it blank.",
  )
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/**
 * Alt text: what the image SHOWS, for a reader who can't see it.
 *
 * Blank is allowed and meaningful — see the per-field notes on where it means
 * "decorative" and where it means "fall back to the title".
 *
 * The "photo of" rule is not pedantry: assistive tech already announces that
 * the element is an image, so "Photo of a skin fade" is read as "image, photo
 * of a skin fade". The prefix costs the listener time and carries nothing.
 */
const REDUNDANT_ALT_PREFIX =
  /^\s*(an?\s+)?(image|photo(graph)?|picture|pic|graphic|screenshot)\s+(of|showing)\b/i;

const altText = z
  .string()
  .trim()
  .max(250, "Keep alt text under 250 characters.")
  .refine(
    (value) => !REDUNDANT_ALT_PREFIX.test(value),
    'Just describe the image — screen readers already say "image", so "photo of…" is read twice.',
  )
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/** An image URL that may be left blank. Same safety rules as `imageRef`. */
const optionalImageRef = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === "" || isSafeImageUrl(value),
    "Enter a valid image URL (https://… or /path).",
  )
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/**
 * An intrinsic pixel dimension, or nothing.
 *
 * 40000 is not a guess at the biggest sensible photograph — it is above every
 * real camera and below the point where an aspect ratio computed from it starts
 * losing precision, which is all the bound is for.
 */
const pixelSize = z
  .number()
  .int()
  .positive()
  .max(40000)
  .optional()
  .catch(undefined);

/** Blank becomes undefined, so an emptied field stops rendering entirely. */
const optionalText = (max: number) =>
  text
    .max(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

/**
 * A block of fields that is either filled in or absent altogether.
 *
 * The form always submits the whole object once it has rendered the inputs, so
 * "the owner cleared this block" arrives as an object of empty strings rather
 * than as a missing key. `key` names the field that decides: blank there means
 * the owner does not want the block, and it collapses to undefined so the
 * template renders nothing instead of an empty card.
 *
 * Built from `.optional().transform()` rather than `z.preprocess`, deliberately:
 * preprocess widens the schema's INPUT type to `unknown`, and zodResolver takes
 * the form's value type from exactly that — one preprocessed field turns a
 * fully typed form into `FieldValues`.
 */
const optionalBlock = <T extends z.ZodRawShape>(
  shape: T,
  key: keyof T & string,
) =>
  z
    .object(shape)
    .transform((value) =>
      String((value as Record<string, unknown>)[key] ?? "").trim()
        ? value
        : undefined,
    )
    // `.optional()` LAST. A field counts as optional in the parent object's
    // type only when its schema is itself optional — wrap a transform around an
    // optional and the key becomes required-but-undefined, which no stored
    // content satisfies.
    .optional();

const ctaSchema = z.object({
  label: requiredText("Button label is required."),
  href: link,
  arrow: z.boolean().optional(),
});

const headingSchema = z.object({
  label: requiredText("Eyebrow label is required."),
  title: requiredText("Title is required."),
  subtitle: text.max(300).optional(),
  /**
   * A link set opposite the heading. Only some templates place one; those that
   * don't never render the input, and the value passes through their saves
   * untouched.
   */
  link: optionalBlock(
    { label: text.max(80), href: text.max(2048), arrow: z.boolean().optional() },
    "label",
  ),
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
  /**
   * Which source drives the scroll-scrub. "frames" uses the template's built-in
   * WebP sequence; "video" samples an mp4 the owner uploaded or linked.
   */
  heroMedia: z.enum(["frames", "video"]).optional(),
  /**
   * The scrub video: a Supabase Storage URL from the uploader, or any https URL
   * the owner pastes. Empty string is normalised to undefined so clearing the
   * field falls back to the template's own video.
   */
  heroVideoUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) => value === "" || isSafeVideoUrl(value),
      "Enter a valid video URL (https://… or /path) ending in .mp4 or .webm.",
    )
    .transform((value) => (value === "" ? undefined : value))
    .optional(),

  // ── Still-photograph heroes ────────────────────────────────────────────────
  // Templates whose hero is a picture rather than a scroll-scrub. Absent on the
  // others, which never render these inputs.
  image: optionalImageRef,
  imageAlt: altText,
  /** Status pill over the photograph, e.g. "Taking orders this week". */
  badge: optionalText(80),
  /** Faces, stars and a sentence. Blank `highlight` removes the strip. */
  proof: optionalBlock(
    {
      // Decorative portraits — no alt, because the sentence carries the claim.
      avatars: z
        .array(z.string().trim())
        .transform((items) => items.filter(Boolean))
        .refine(
          (items) => items.every(isSafeImageUrl),
          "Each avatar must be a valid image URL (https://… or /path).",
        )
        .refine((items) => items.length <= 6, "Add at most 6 faces."),
      rating: z
        .number({ message: "Choose 1–5 stars." })
        .int("Choose a whole number of stars.")
        .min(1, "Choose 1–5 stars.")
        .max(5, "Choose 1–5 stars."),
      highlight: text.max(60),
      text: text.max(200),
    },
    "highlight",
  ),
  /** Availability card over the photograph. Blank `title` removes it. */
  card: optionalBlock(
    {
      image: optionalImageRef,
      title: text.max(80),
      subtitle: text.max(120),
      // Bounded because it paints a fill inside a fixed track; the template
      // clamps too, but a stored 400 would still be wrong on every other read.
      progress: z
        .number({ message: "Enter a percentage between 0 and 100." })
        .min(0, "Enter a percentage between 0 and 100.")
        .max(100, "Enter a percentage between 0 and 100."),
      note: text.max(120),
    },
    "title",
  ),
});

// ── About ────────────────────────────────────────────────────────────────────
export const aboutSchema = z.object({
  label: requiredText("Eyebrow label is required."),
  titleLines: requiredStringList("Add at least one title line."),
  text: requiredText("Body text is required."),
  features: optionalStringList(12),
  cta: ctaSchema,
  image: imageRef,
  // Blank keeps the photo decorative (alt=""), which is the right default here.
  imageAlt: altText,
  badgeValue: requiredText("Badge value is required."),
  badgeLabel: requiredText("Badge label is required."),

  // ── Editorial stories ──────────────────────────────────────────────────────
  /** Further paragraphs after the body text. */
  paragraphs: optionalStringList(8).optional(),
  /** A figures row beneath the copy. */
  stats: z
    .array(
      z.object({
        value: requiredText("Value is required."),
        label: requiredText("Label is required."),
      }),
    )
    .max(4)
    .optional(),
  /** The owner's sign-off. Blank `name` removes it. */
  signature: optionalBlock({ name: text.max(60), role: text.max(120) }, "name"),
});

// ── Services ─────────────────────────────────────────────────────────────────
export const servicesSchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z.object({
        /**
         * Blank is allowed: templates that lead with a photograph have no glyph
         * slot at all, and requiring one would mean inventing an emoji that
         * nothing renders. Templates that DO use icons show the input, where an
         * empty tile is immediately visible to the owner who left it blank.
         */
        icon: text.max(20),
        title: requiredText("Title is required."),
        description: requiredText("Description is required."),
        price: requiredText("Price is required."),
        unit: text.max(40),
        // Photograph-led cards.
        image: optionalImageRef,
        imageAlt: altText,
        /** Small pill above the title, e.g. "Signature". */
        tag: optionalText(40),
        /** Line opposite the price, e.g. "Serves 12–14". */
        meta: optionalText(60),
      }),
    )
    .min(1, "Add at least one service."),
});

// ── Barbers (the team) ───────────────────────────────────────────────────────
export const barbersSchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z.object({
        name: requiredText("Name is required."),
        role: requiredText("Role is required."),
        bio: text.max(400),
        image: imageRef,
        // Stored as plain URLs; the rendered SocialLink (label + aria-label) is
        // derived in lib/website/build-profile.ts.
        instagramUrl: optionalProfileUrl,
        facebookUrl: optionalProfileUrl,
      }),
    )
    .min(1, "Add at least one team member."),
});

// ── Products (the shop) ──────────────────────────────────────────────────────
export const productsSchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z.object({
        /** Blank is allowed — see the note on `Service.icon`. */
        icon: text.max(20),
        name: requiredText("Name is required."),
        description: requiredText("Description is required."),
        price: requiredText("Price is required."),
        // Corner ribbon ("BEST SELLER"). Blank means no ribbon at all, so it is
        // normalised away rather than stored as an empty badge.
        tag: optionalText(40),
        // Photograph-led cards.
        image: optionalImageRef,
        imageAlt: altText,
        /** Short qualifier under the name, e.g. "Box of 6". */
        meta: optionalText(60),
      }),
    )
    .min(1, "Add at least one product."),
});

// ── Testimonials ─────────────────────────────────────────────────────────────
export const testimonialsSchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z.object({
        // A real number, not a coerced one: `z.coerce` widens the schema's INPUT
        // type to `unknown`, which no longer matches the form's value type. The
        // <select> converts with `valueAsNumber` instead, so both sides agree.
        //
        // Bounded to the five stars the card can draw — it renders one glyph per
        // unit, so an unbounded value would paint an arbitrarily long row.
        rating: z
          .number({ message: "Choose 1–5 stars." })
          .int("Choose a whole number of stars.")
          .min(1, "Choose 1–5 stars.")
          .max(5, "Choose 1–5 stars."),
        text: requiredText("Quote is required.").max(600),
        author: requiredText("Author name is required."),
        meta: text.max(120),
        // `initials` is intentionally absent — derived from `author` when the
        // profile is built, so it can never drift from the name beside it.
      }),
    )
    .min(1, "Add at least one testimonial."),
});

// ── FAQ ──────────────────────────────────────────────────────────────────────
/**
 * Question/answer pairs.
 *
 * `items` may be EMPTY — the only section where that is allowed. Every other
 * section falls back to template content when a tenant saves nothing, so an
 * empty save would publish a blank strip. Here the section simply disappears,
 * which is the correct outcome for a shop that has no FAQ yet and the only way
 * an owner can remove one they no longer want.
 *
 * The length caps are the FAQPage contract as much as a UI one: an answer that
 * runs to essay length stops being quotable by an answer engine, which is the
 * entire reason this section exists.
 */
export const faqSchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z.object({
        question: requiredText("Question is required.").max(300),
        answer: requiredText("Answer is required.").max(1200),
      }),
    )
    .max(30, "Add at most 30 questions."),
});

// ── Gallery ──────────────────────────────────────────────────────────────────
export const gallerySchema = z.object({
  heading: headingSchema,
  items: z
    .array(
      z
        .object({
          title: requiredText("Title is required."),
          by: text.max(120),
          // Blank becomes undefined so the template renders no empty line.
          caption: text
            .max(200)
            .transform((value) => (value === "" ? undefined : value))
            .optional(),
          image: imageRef,
          alt: altText,
          wide: z.boolean().optional(),
          /**
           * Measured in the browser when the photograph was added, never typed.
           * `NaN` is the shape an empty number input arrives in, so it is
           * normalised away rather than rejected — a picture whose size could
           * not be read is not an error, it just falls back to a fixed ratio.
           */
          width: pixelSize,
          height: pixelSize,
        })
        /*
         * Refused: alt text identical to the title.
         *
         * That is the exact defect this field was added to fix — the title is
         * already rendered in the figcaption below the photo, so repeating it
         * makes a screen reader announce the same words twice and describe
         * nothing. Allowing it would let the alt be "filled in", and the
         * visibility score awarded, without a single reader being better off.
         */
        .refine(
          (item) =>
            !item.alt ||
            item.alt.trim().toLowerCase() !== item.title.trim().toLowerCase(),
          {
            path: ["alt"],
            message:
              "Describe what the photo shows — repeating the title tells a screen-reader user nothing new.",
          },
        ),
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
  barbers: barbersSchema,
  gallery: gallerySchema,
  products: productsSchema,
  testimonials: testimonialsSchema,
  faq: faqSchema,
  contact: contactSchema,
  footer: footerSchema,
} satisfies Record<WebsiteSection, z.ZodTypeAny>;

export type HeroFormValues = z.infer<typeof heroSchema>;
export type AboutFormValues = z.infer<typeof aboutSchema>;
export type ServicesFormValues = z.infer<typeof servicesSchema>;
export type BarbersFormValues = z.infer<typeof barbersSchema>;
export type GalleryFormValues = z.infer<typeof gallerySchema>;
export type ProductsFormValues = z.infer<typeof productsSchema>;
export type TestimonialsFormValues = z.infer<typeof testimonialsSchema>;
export type FaqFormValues = z.infer<typeof faqSchema>;
export type ContactFormValues = z.infer<typeof contactSchema>;
export type FooterFormValues = z.infer<typeof footerSchema>;
