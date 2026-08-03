import { z } from "zod";
import type { LeadKindEnum } from "@/types/database";

/**
 * Validation for the marketing site's enquiry forms.
 *
 * This is an UNAUTHENTICATED, public endpoint reachable by anyone, so the
 * schema is the boundary: every field is length-capped to match the CHECK
 * constraints in migration 0029, so a payload that would be rejected by the
 * database is rejected here first with a message a person can act on.
 */

/** Blank optional inputs arrive as "" from a form; store null, not "". */
const optional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

export const LEAD_KINDS = ["consultation", "contact"] as const;

/** What the consultation form offers. Free text is still accepted from `other`. */
export const PROJECT_TYPES = [
  "Custom software",
  "Web application",
  "Mobile app",
  "AI solution",
  "IoT solution",
  "Enterprise system",
  "Website for my business",
  "Something else",
] as const;

export const leadSchema = z.object({
  kind: z.enum(LEAD_KINDS),
  name: z.string().trim().min(1, "Your name is required.").max(120),
  email: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .email("Enter a valid email address so we can reply."),
  phone: optional(32),
  projectType: optional(80),
  preferredDate: optional(20),
  preferredTime: optional(20),
  message: optional(4000),

  /*
   * Honeypot. Hidden from people by CSS and skipped by the tab order, so a
   * human never fills it in and most bots do. Anything here means "discard",
   * which the action does WITHOUT telling the sender — reporting the rejection
   * is how a bot author learns which field to leave alone.
   */
  company: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** The row shape the repository inserts. */
export interface NewLead {
  kind: LeadKindEnum;
  name: string;
  email: string;
  phone: string | null;
  projectType: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  message: string | null;
  sourceIp: string | null;
}
