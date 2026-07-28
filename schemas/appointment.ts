import { z } from "zod";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from "@/types/appointment";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalShort = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(160).optional(),
);
const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(2000).optional(),
);

// Matches an <input type="datetime-local"> value.
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const statusSchema = z.enum(
  APPOINTMENT_STATUSES as [AppointmentStatus, ...AppointmentStatus[]],
);

export const createAppointmentSchema = z.object({
  customerId: z.preprocess(
    emptyToUndefined,
    z.string().uuid("Select a valid customer.").optional(),
  ),
  service: optionalShort,
  staff: optionalShort,
  status: statusSchema.default("scheduled"),
  startsAt: z
    .string()
    .regex(DATETIME_LOCAL, "Enter a valid date and time."),
  endsAt: z.preprocess(
    emptyToUndefined,
    z.string().regex(DATETIME_LOCAL, "Enter a valid date and time.").optional(),
  ),
  notes: optionalText,
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentSchema.partial();
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const appointmentListQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, statusSchema.optional()).catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10).default(10),
});

export type AppointmentListQueryInput = z.infer<
  typeof appointmentListQuerySchema
>;

/** ?month=YYYY-MM for the calendar; falls back handled by the caller. */
export const monthParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional();
