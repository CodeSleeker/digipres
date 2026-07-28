import type { AppointmentStatusEnum } from "./database";

export type AppointmentStatus = AppointmentStatusEnum;

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export interface Appointment {
  id: string;
  businessId: string;
  customerId: string | null;
  /** Denormalized for display (joined from customers). */
  customerName: string | null;
  service: string | null;
  staff: string | null;
  status: AppointmentStatus;
  /** ISO timestamp. */
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AppointmentListQuery {
  status?: AppointmentStatus;
  page: number;
  pageSize: number;
}

export interface AppointmentListResult {
  rows: Appointment[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Minimal customer shape for the appointment form's selector. */
export interface CustomerOption {
  id: string;
  name: string;
}
