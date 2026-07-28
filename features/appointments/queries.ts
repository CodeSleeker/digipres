import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { AppointmentRepository } from "@/repositories/appointment-repository";
import { CustomerRepository } from "@/repositories/customer-repository";
import { AppointmentService } from "@/services/appointment-service";
import { makeReviewAutomationService } from "@/features/reviews/service";
import type {
  Appointment,
  AppointmentListResult,
  CustomerOption,
} from "@/types/appointment";
import type { AppointmentListQueryInput } from "@/schemas/appointment";

export function makeAppointmentService(
  supabase: SupabaseClient<Database>,
): AppointmentService {
  return new AppointmentService(
    new AppointmentRepository(supabase),
    makeReviewAutomationService(supabase),
  );
}

const EMPTY = (query: AppointmentListQueryInput): AppointmentListResult => ({
  rows: [],
  total: 0,
  page: query.page,
  pageSize: query.pageSize,
  pageCount: 1,
});

export async function getAppointments(
  query: AppointmentListQueryInput,
): Promise<AppointmentListResult> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return EMPTY(query);
  return makeAppointmentService(supabase).list(businessId, query);
}

/** All appointments in the given YYYY-MM month (for the calendar). */
export async function getAppointmentsForMonth(
  month: string,
): Promise<Appointment[]> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return [];
  const { start, end } = monthRange(month);
  return makeAppointmentService(supabase).listBetween(businessId, start, end);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return null;
  return makeAppointmentService(supabase).get(businessId, id);
}

export async function getCustomerOptions(): Promise<CustomerOption[]> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return [];
  return new CustomerRepository(supabase).listOptions(businessId);
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${month}-01T00:00:00`,
    end: `${month}-${String(days).padStart(2, "0")}T23:59:59`,
  };
}
