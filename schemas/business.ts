import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";
import type { BusinessCategoryEnum } from "@/types/database";

/**
 * Zod validation for the Business entity. The service and server actions parse
 * all input through these before it reaches the database.
 */

/**
 * The industries a business can be, IN THE ORDER PICKERS SHOW THEM — the
 * onboarding wizard renders this list directly rather than keeping its own
 * copy, which is how "cafe" and "bakery" would otherwise end up disagreeing
 * between the form and the validator.
 *
 * `satisfies` ties it to the database enum: a value the column would reject
 * fails to compile here. The reverse — a member of the enum MISSING from this
 * list — is caught by tests/business-categories.test.ts, since a type cannot
 * check an array for completeness.
 *
 * To add one: `alter type public.business_category add value '<name>'` in a
 * migration, then extend BusinessCategoryEnum, this list, and CATEGORY_TYPE.
 */
export const BUSINESS_CATEGORIES = [
  "barber",
  "salon",
  "spa",
  "clinic",
  "dental",
  "construction",
  "restaurant",
  "cafe",
  "bakery",
  "retail",
  "automotive",
  "fitness",
  "lodging",
  "other",
] as const satisfies readonly BusinessCategoryEnum[];

/**
 * A blank field is an instruction — "remove this" — not an omission.
 *
 * The distinction is load-bearing throughout this file. BusinessRepository.update
 * writes only the fields that are not `undefined`, so a blank that parsed to
 * `undefined` would be silently dropped: the form reports "saved" and the value
 * is still there. `null` clears the column; leaving the field out of the request
 * entirely is what leaves it untouched, which is what keeps partial updates
 * partial.
 */
const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = z.preprocess(
  emptyToNull,
  z.string().trim().max(2000).nullable().optional(),
);

const optionalPhone = z.preprocess(
  emptyToNull,
  z.string().trim().max(40).nullable().optional(),
);

/** A single-line value — a city, a province, a postcode. */
const optionalShortText = z.preprocess(
  emptyToNull,
  z.string().trim().max(120).nullable().optional(),
);

/**
 * A boolean arriving from a form.
 *
 * FormData carries strings, and an UNCHECKED checkbox submits nothing at all —
 * which would parse as "field omitted, leave it alone" and make the box
 * impossible to untick. Forms therefore submit this as an explicit hidden
 * "true"/"false" (see the contact details form) and this accepts either that or
 * a real boolean. Anything unrecognised is left `undefined` so the column is
 * untouched, rather than being coerced to false and silently disabling texts.
 */
const checkboxBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "on") return true;
  if (value === "false" || value === "off") return false;
  return undefined;
}, z.boolean().optional());

/**
 * A web address.
 *
 * The scheme check is NOT decoration. Zod's `.url()` only asks whether the
 * string parses as a URL, and `javascript:alert(1)` parses perfectly well —
 * these values are rendered as `<a href>` (the footer social icons, the contact
 * card), so accepting any scheme would make the CMS a stored-XSS vector. Only
 * http(s) may be stored.
 *
 * Blank clears the column — see `emptyToNull` above.
 */
const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .url("Enter a valid URL.")
    .max(2048)
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "Links must start with http:// or https://.",
    )
    .nullable()
    .optional(),
);

/**
 * Wordmark override. `null` removes it, so the wordmark reverts to being
 * derived from the business name (lib/website/build-profile.ts).
 */
export const businessBrandSchema = z.object({
  namePrimary: z.string().trim().min(1, "Primary word is required.").max(40),
  nameAccent: z.string().trim().max(40).default(""),
  // Blank is allowed: `resolveBrand` backfills it from the primary word.
  initial: z.string().trim().max(2).default(""),
});
/**
 * A wall-clock time, `HH:mm`, or nothing.
 *
 * Anchored on the hour and minute RANGES rather than the shape: some mobile
 * keyboards hand over a seconds component or an out-of-range hour, and "25:00"
 * would otherwise be published as a check-in time.
 */
const optionalTime = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time, like 14:00.")
    .nullable()
    .optional(),
);

/**
 * A count an owner types, or nothing.
 *
 * An empty number input arrives as NaN, which must become "unanswered" rather
 * than failing the save — losing the whole form because a field was left blank
 * is the wrong error to make.
 */
const optionalCount = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(v) ? null : v),
    z.coerce.number().int().min(1).max(max).nullable().optional(),
  );

/**
 * Structured facts about a place to stay (migration 0037).
 *
 * Every field is optional, and that is the contract: an unanswered question
 * publishes nothing. A `petsAllowed: false` that nobody chose would be a claim
 * the owner never made, so the tri-state is preserved all the way through —
 * yes, no, or not said.
 */
export const lodgingDetailsSchema = z.object({
  checkInTime: optionalTime,
  checkOutTime: optionalTime,
  bedrooms: optionalCount(60),
  maxGuests: optionalCount(200),
  petsAllowed: z.preprocess(
    (v) => (v === "" || v === "unset" || v === null ? null : v),
    z.enum(["yes", "no"]).nullable().optional(),
  ),
  amenities: z
    .array(z.string())
    .transform((items) => items.map((s) => s.trim()).filter(Boolean))
    .refine((items) => items.length <= 40, "Add at most 40 amenities.")
    .refine(
      (items) => items.every((s) => s.length <= 60),
      "Keep each amenity under 60 characters.",
    )
    .optional(),
});

export type LodgingDetailsInput = z.infer<typeof lodgingDetailsSchema>;

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email("Enter a valid email address.").nullable().optional(),
);

/**
 * Alphanumeric SMS sender ID (migration 0028).
 *
 * The GSM cap is 11 characters and carriers reject anything outside
 * [A-Za-z0-9 ] — so this validates rather than silently trimming. A sender ID
 * that gets quietly truncated is one the carrier may not recognise as the
 * registered value, and the message is then relabelled or dropped.
 *
 * Blank clears the column (null), which is a meaningful state: "no explicit
 * sender, use the provider default where one exists".
 */
/**
 * The address a tenant's weekly digest is sent from.
 *
 * Lower-cased and format-checked to match the database constraint, so a value
 * that would be rejected by the column is rejected here with a message someone
 * can act on. Blank clears it — and clearing it turns the whole feature off,
 * which is the intended way to switch a newsletter back off.
 *
 * NOT validated for deliverability, which no regex can do. Whether the domain
 * is actually authorised to send is settled by DNS and recorded separately in
 * `newsletterVerified`.
 */
export const newsletterSenderSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .regex(
      /^[^@\s]+@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/,
      "Enter a full address on the client's own domain, e.g. news@theirbakery.ph.",
    )
    .nullable()
    .optional(),
);

export const smsSenderIdSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(11, "Sender IDs are limited to 11 characters.")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9 ]*$/,
      "Use letters, numbers and spaces only, starting with a letter or number.",
    )
    .nullable()
    .optional(),
);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm" 24h

const dayHoursSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    closed: z.boolean(),
    open: z.string().regex(TIME_PATTERN, "Use HH:mm.").nullable(),
    close: z.string().regex(TIME_PATTERN, "Use HH:mm.").nullable(),
  })
  .refine((d) => d.closed || (d.open !== null && d.close !== null), {
    message: "Open and close times are required unless the day is closed.",
  });

export const businessHoursSchema = z.array(dayHoursSchema).max(7);

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required.").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(63)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens."),
  description: optionalText,
  phone: optionalPhone,
  email: optionalEmail,
  /** Alert destinations. Null means "use the public phone/email above". */
  notifyEmail: optionalEmail,
  notifyPhone: optionalPhone,
  notifyCustomerSms: checkboxBoolean,
  smsSenderId: smsSenderIdSchema,
  /**
   * The digest sender, on a domain the tenant controls.
   *
   * Platform-side, exactly like `smsSenderId` and for the same reason: it is an
   * arrangement with DNS and a mail provider, not a preference. A field the
   * client could edit would look configurable and mostly break their sending.
   */
  newsletterFromEmail: newsletterSenderSchema,
  newsletterFromName: optionalShortText,
  /**
   * Absent from any owner-facing form on purpose. It appears here only so the
   * platform action can pass it; the database refuses an owner session that
   * tries, so this is the convenience, not the control.
   */
  newsletterVerified: checkboxBoolean.optional(),
  /** Street line only; the components below carry the rest. */
  address: optionalText,
  addressLocality: optionalShortText,
  addressRegion: optionalShortText,
  addressPostalCode: optionalShortText,
  /**
   * ISO 3166-1 alpha-2. Constrained and upper-cased because schema.org
   * consumers read this as a code — "Philippines" in an `addressCountry` is
   * accepted by the spec but is weaker than "PH", and free text here would
   * mostly produce the weaker form.
   */
  addressCountry: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim() === ""
          ? null
          : value.trim().toUpperCase()
        : value,
    z
      .string()
      .regex(/^[A-Z]{2}$/, "Use a 2-letter country code, e.g. PH.")
      .nullable()
      .optional(),
  ),
  logoUrl: optionalUrl,
  wordmarkUrl: optionalUrl,
  faviconUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  brand: businessBrandSchema.nullable().optional(),
  /*
   * A point on the earth, or nothing. Bounded because an out-of-range value is
   * not a typo the database will catch politely — the column constraint would
   * reject the whole save, and a longitude of 1240 (a mistyped 124.0) that DID
   * get through would publish the business as being nowhere.
   */
  latitude: z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(v) ? null : v),
    z.coerce.number().min(-90).max(90).nullable().optional(),
  ),
  longitude: z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(v) ? null : v),
    z.coerce.number().min(-180).max(180).nullable().optional(),
  ),
  category: z.enum(BUSINESS_CATEGORIES),
  ownerName: z.preprocess(
    emptyToNull,
    z.string().trim().max(120).nullable().optional(),
  ),
  hours: businessHoursSchema.optional().default([]),
  googleReviewUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  websiteUrl: optionalUrl,
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

// Every field optional for partial updates; still validated when present.
export const updateBusinessSchema = createBusinessSchema.partial();

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
