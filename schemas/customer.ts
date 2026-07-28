import { z } from "zod";
import {
  REVIEW_STATUSES,
  SMS_STATUSES,
  type ReviewStatus,
  type SmsStatus,
} from "@/types/customer";
import { toE164 } from "@/lib/sms/phone";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// Normalize to E.164 when confident; otherwise keep the owner's raw entry (so no
// data is lost) — sending is gated on a valid E.164 number downstream.
const mobileField = z
  .preprocess(emptyToUndefined, z.string().trim().max(40).optional())
  .transform((v) => (typeof v === "string" ? (toE164(v) ?? v) : v));

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(2000).optional(),
);
const optionalShort = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(160).optional(),
);
const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().email("Enter a valid email address.").optional(),
);
const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
    .optional(),
);

const reviewStatusSchema = z.enum(
  REVIEW_STATUSES as [ReviewStatus, ...ReviewStatus[]],
);
const smsStatusSchema = z.enum(SMS_STATUSES as [SmsStatus, ...SmsStatus[]]);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  mobile: mobileField,
  email: optionalEmail,
  address: optionalText,
  lastVisit: optionalDate,
  preferredStaff: optionalShort,
  servicesAvailed: z
    .array(z.string())
    .optional()
    .transform((items) => (items ?? []).map((s) => s.trim()).filter(Boolean)),
  notes: optionalText,
  reviewStatus: reviewStatusSchema.default("pending"),
  smsStatus: smsStatusSchema.default("not_sent"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

/** Query params for the list view (from the URL). */
export const customerListQuerySchema = z.object({
  q: z
    .preprocess(emptyToUndefined, z.string().trim().max(120).optional())
    .catch(undefined),
  reviewStatus: z
    .preprocess(emptyToUndefined, reviewStatusSchema.optional())
    .catch(undefined),
  smsStatus: z
    .preprocess(emptyToUndefined, smsStatusSchema.optional())
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10).default(10),
});

export type CustomerListQueryInput = z.infer<typeof customerListQuerySchema>;
