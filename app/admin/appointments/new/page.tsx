import { guardPage } from "@/lib/features/guard";
import Link from "next/link";
import { getCustomerOptions } from "@/features/appointments/queries";
import { AppointmentForm } from "../_components/appointment-form";

export default async function NewAppointmentPage() {
  await guardPage("appointments");
  const customers = await getCustomerOptions();

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
          New Appointment
        </h1>
      </div>
      <AppointmentForm mode="create" customers={customers} />
    </div>
  );
}
