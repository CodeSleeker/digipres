import { guardPage } from "@/lib/features/guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAppointment,
  getCustomerOptions,
} from "@/features/appointments/queries";
import { AppointmentForm } from "../../_components/appointment-form";

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardPage("appointments");

  const { id } = await params;
  const [appointment, customers] = await Promise.all([
    getAppointment(id),
    getCustomerOptions(),
  ]);
  if (!appointment) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/appointments"
          className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
        >
          ← Back to appointments
        </Link>
        <h1 className="mt-2 font-admin-heading text-2xl tracking-[2px]">
          Edit Appointment
        </h1>
      </div>
      <AppointmentForm
        mode="edit"
        appointment={appointment}
        customers={customers}
      />
    </div>
  );
}
