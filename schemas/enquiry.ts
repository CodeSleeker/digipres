import { z } from "zod";

/**
 * A question submitted by a MEMBER OF THE PUBLIC from a tenant's website.
 *
 * Parsed from an unauthenticated request body, so it is deliberately narrow:
 * no business id, no read state, no status. The tenant is resolved from the
 * request host, never from this payload (see lib/tenant/request-tenant.ts).
 */

const trimmed = (max: number) => z.string().trim().max(max);

/** Blank arrives from an untouched input; it means "not given", not "empty". */
const optional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed(max).optional(),
  );

export const enquiryRequestSchema = z
  .object({
    name: trimmed(120).min(1, "Please enter your name."),
    email: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .max(254)
        .email("Please enter a valid email address.")
        .optional(),
    ),
    phone: optional(40),
    /** From the template's own list; free text because those are CMS content. */
    topic: optional(160),
    message: trimmed(4000).min(1, "Please write your question."),
    /**
     * Only consulted when the request host does not identify a tenant — local
     * dev and the apex domain, where the site is served from /s/<slug>. On a
     * real tenant host the host wins and this is ignored entirely.
     */
    slug: optional(63),
  })
  /*
   * One reply route, at minimum.
   *
   * Mirrors the database constraint rather than trusting it: a question nobody
   * can answer is worse than no question, and failing here gives the visitor a
   * message on the field instead of a 500 from Postgres.
   */
  .refine((value) => Boolean(value.email || value.phone), {
    path: ["email"],
    message: "Please leave an email address or a mobile number so we can reply.",
  });

export type EnquiryRequestInput = z.infer<typeof enquiryRequestSchema>;
