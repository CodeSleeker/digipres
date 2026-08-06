import { z } from "zod";

/**
 * Validation for the mailing list.
 *
 * The signup schema is parsed from an UNAUTHENTICATED request body — anyone on
 * the internet can post to it — so it is deliberately narrow: an address, where
 * it came from, and the tenant hint. No status, no tokens, no business id. Who
 * the list belongs to is resolved from the request host, never from the payload
 * (the same rule as bookings).
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const subscribeSchema = z.object({
  /**
   * Lower-cased here so "A@x.com" and "a@x.com" are one person before the
   * unique index has to decide, and because the column's own CHECK requires it.
   *
   * The pattern is deliberately loose. Address syntax is far stranger than any
   * regex people actually write, and the real proof that an address works is
   * the confirmation email — which this flow sends before mailing anyone
   * anything. Rejecting exotic-but-valid addresses would be a worse failure
   * than accepting a typo that then goes quiet.
   */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(254)
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address."),
  /**
   * The wording the visitor agreed to, echoed back by the form.
   *
   * Capped and stored verbatim: the consent record has to say what THEY were
   * shown, and the site copy will change. Not trusted for anything except the
   * record — it is submitted by the client, so it is evidence of what the page
   * said, not proof of anything.
   */
  consentText: trimmed(500).optional(),
  /** Which control they used, for when there is more than one. */
  source: trimmed(40).optional(),
  /**
   * Only consulted when the request host does not identify a tenant — local
   * dev and the apex, where sites are served from /s/<slug>.
   */
  slug: trimmed(63).optional(),
  /**
   * Honeypot. Hidden from people with CSS and skipped in the tab order, so a
   * human never fills it in and most bots do. A filled value is discarded
   * WITHOUT telling the sender — reporting the rejection is how a bot author
   * learns which field to leave alone.
   */
  company: z.string().max(200).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

/**
 * A thing the business has made, written by the owner.
 *
 * `publishedAt` is optional on create and defaults to now, so the common case
 * — "I made this today" — needs no date picking at all.
 */
export const creationSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(120),
  description: trimmed(2000).optional(),
  imageUrl: trimmed(2048).optional(),
  /** Free text, not a number: "₱1,280", "from ₱450", "" are all legitimate. */
  price: trimmed(40).optional(),
  publishedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
    .optional(),
});

export type CreationInput = z.infer<typeof creationSchema>;
