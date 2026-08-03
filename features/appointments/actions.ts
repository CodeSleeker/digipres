"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { featureError } from "@/lib/features/guard";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { AppointmentRepository } from "@/repositories/appointment-repository";
import { CustomerRepository } from "@/repositories/customer-repository";
import { AppointmentService } from "@/services/appointment-service";
import { notifyCustomerBookingConfirmed } from "@/lib/notifications/customer-notice";
import type { Appointment } from "@/types/appointment";
import type { Business } from "@/types/business-entity";
import { makeReviewAutomationService } from "@/features/reviews/service";
import { BusinessError } from "@/services/business-service";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/schemas/appointment";

export type AppointmentFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  id?: string;
};

function makeService(supabase: SupabaseClient<Database>): AppointmentService {
  return new AppointmentService(
    new AppointmentRepository(supabase),
    makeReviewAutomationService(supabase),
  );
}

const NO_BUSINESS: AppointmentFormState = {
  error: "Create your business profile before scheduling appointments.",
};

function parseContent(formData: FormData): unknown {
  const raw = formData.get("content");
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fieldErrorsOf(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages && messages.length) out[key] = messages;
  }
  return out;
}

export async function createAppointment(
  formData: FormData,
): Promise<AppointmentFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "appointments");
  if (denied) return { error: denied };

  const parsed = createAppointmentSchema.safeParse(parseContent(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    const appointment = await makeService(supabase).create(
      businessId,
      parsed.data,
    );
    await auditTenantAction(context, "appointment.created", {
      entity: "appointment",
      entityId: appointment.id,
    });
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/appointments/calendar");
    return { success: true, id: appointment.id };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

export async function updateAppointment(
  formData: FormData,
): Promise<AppointmentFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "appointments");
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing appointment id." };

  const parsed = updateAppointmentSchema.safeParse(parseContent(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    const service = makeService(supabase);
    // Read before writing so the STATUS TRANSITION is visible. Confirming is
    // what the customer is waiting to hear about; re-saving an already
    // confirmed appointment must not text them again.
    const before = await service.get(businessId, id);
    const updated = await service.update(businessId, id, parsed.data);

    if (before && before.status !== "confirmed" && updated.status === "confirmed") {
      await tellCustomerItsConfirmed(supabase, context.business, updated);
    }

    await auditTenantAction(context, "appointment.updated", {
      entity: "appointment",
      entityId: id,
      metadata: { fields: Object.keys(parsed.data) },
    });
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/appointments/calendar");
    revalidatePath(`/admin/appointments/${id}/edit`);
    return { success: true, id };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

export async function deleteAppointment(
  formData: FormData,
): Promise<AppointmentFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const denied = await featureError(supabase, businessId, "appointments");
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing appointment id." };

  try {
    await makeService(supabase).softDelete(businessId, id);
    await auditTenantAction(context, "appointment.deleted", {
      entity: "appointment",
      entityId: id,
    });
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/appointments/calendar");
    return { success: true };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

/**
 * Text the customer that their booking is confirmed.
 *
 * Best-effort and swallowed on purpose: the confirmation is already saved, and
 * a carrier failure must not roll it back or show the owner an error for
 * something that did work. `notifyCustomerBookingConfirmed` never throws; this
 * guards the lookups around it.
 *
 * The time is read by slicing the stored timestamp rather than converting it —
 * appointment times are the customer's wall clock pinned to UTC (see
 * schemas/booking.ts), so a timezone conversion here would text them a
 * different time from the one every screen shows.
 */
async function tellCustomerItsConfirmed(
  supabase: SupabaseClient<Database>,
  business: Business | null,
  appointment: Appointment,
): Promise<void> {
  if (!business || !appointment.customerId) return;

  try {
    const customer = await new CustomerRepository(supabase).findById(
      business.id,
      appointment.customerId,
    );
    if (!customer) return;

    const result = await notifyCustomerBookingConfirmed(business, customer, {
      businessName: business.name,
      smsSenderId: business.smsSenderId,
      customerName: customer.name,
      service: appointment.service,
      date: appointment.startsAt.slice(0, 10),
      time: appointment.startsAt.slice(11, 16),
    });
    console.info(
      "[appointment:confirmed] appointment=%s customer-sms=%s",
      appointment.id,
      result,
    );
  } catch (error) {
    console.error("[appointment:confirmed]", error);
  }
}

function toMessage(error: unknown): string {
  if (error instanceof BusinessError && error.code === "NOT_FOUND") {
    return "Create your business profile before scheduling appointments.";
  }
  console.error("[appointments]", error);
  return "Something went wrong. Please try again.";
}
