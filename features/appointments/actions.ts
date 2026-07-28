"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { featureError } from "@/lib/features/guard";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { AppointmentRepository } from "@/repositories/appointment-repository";
import { AppointmentService } from "@/services/appointment-service";
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
    await makeService(supabase).update(businessId, id, parsed.data);
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

function toMessage(error: unknown): string {
  if (error instanceof BusinessError && error.code === "NOT_FOUND") {
    return "Create your business profile before scheduling appointments.";
  }
  console.error("[appointments]", error);
  return "Something went wrong. Please try again.";
}
