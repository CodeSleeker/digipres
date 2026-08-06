import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";
import { newsletterSenderSchema } from "./business";
import {
  DEFAULT_THEME_CODE,
  isValidTemplate,
  isValidTheme,
} from "@/templates/registry";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/**
 * Validation for platform staff onboarding a new client.
 *
 * The slug is optional — it's derived from the business name when omitted (and
 * de-duplicated server-side). The template/theme pair is validated together,
 * since a theme only exists in the context of its template.
 */
export const onboardBusinessSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(1, "Business name is required.")
      .max(120),
    ownerEmail: z.string().trim().email("Enter a valid email address."),
    slug: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(63)
        .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens.")
        .optional(),
    ),
    templateCode: z.string().trim().min(1, "Choose a template."),
    themeCode: z.string().trim().default(DEFAULT_THEME_CODE),
    /**
     * The client's own sending address for the weekly digest, if it is known at
     * onboarding. Optional, and left unverified either way: the DNS records
     * usually do not exist yet at the moment a client is created, and nothing
     * sends until the sender is verified on the business page.
     */
    newsletterFromEmail: newsletterSenderSchema,
    newsletterFromName: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(120).optional(),
    ),
  })
  .refine((v) => isValidTemplate(v.templateCode), {
    message: "Unknown template.",
    path: ["templateCode"],
  })
  .refine((v) => isValidTheme(v.templateCode, v.themeCode), {
    message: "That theme isn't available for this template.",
    path: ["themeCode"],
  });

export type OnboardBusinessInput = z.infer<typeof onboardBusinessSchema>;
