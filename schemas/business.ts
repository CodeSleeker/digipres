import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";

/**
 * Zod validation for the Business entity. The service and server actions parse
 * all input through these before it reaches the database.
 */

const BUSINESS_CATEGORIES = [
  "barber",
  "salon",
  "spa",
  "clinic",
  "dental",
  "construction",
  "restaurant",
  "cafe",
  "retail",
  "automotive",
  "fitness",
  "other",
] as const;

// Treat empty-string form fields as "not provided".
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(2000).optional(),
);
const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().url("Enter a valid URL.").max(2048).optional(),
);
const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().email("Enter a valid email address.").optional(),
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
  phone: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(40).optional(),
  ),
  email: optionalEmail,
  address: optionalText,
  logoUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  category: z.enum(BUSINESS_CATEGORIES),
  ownerName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  hours: businessHoursSchema.optional().default([]),
  googleReviewUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  websiteUrl: optionalUrl,
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

// Every field optional for partial updates; still validated when present.
export const updateBusinessSchema = createBusinessSchema.partial();

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
