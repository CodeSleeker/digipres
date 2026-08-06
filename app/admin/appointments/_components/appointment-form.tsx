"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from "@/schemas/appointment";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABEL,
  type Appointment,
  type CustomerOption,
} from "@/types/appointment";
import {
  createAppointment,
  updateAppointment,
  type AppointmentFormState,
} from "@/features/appointments/actions";
import {
  Field,
  TextAreaField,
  TextField,
  fieldClass,
} from "@/app/admin/website/_forms/form-kit";

type Props = {
  customers: CustomerOption[];
} & (
  | { mode: "create"; appointment?: undefined }
  | { mode: "edit"; appointment: Appointment }
);

export function AppointmentForm(props: Props) {
  const router = useRouter();
  const [result, setResult] = useState<AppointmentFormState | null>(null);
  const [pending, start] = useTransition();

  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(
      createAppointmentSchema,
    ) as unknown as Resolver<CreateAppointmentInput>,
    defaultValues: toDefaults(props.appointment),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    start(async () => {
      const fd = new FormData();
      fd.set("content", JSON.stringify(values));
      if (props.mode === "edit") fd.set("id", props.appointment.id);
      const res =
        props.mode === "edit"
          ? await updateAppointment(fd)
          : await createAppointment(fd);
      setResult(res);
      if (res.success) {
        router.push("/admin/appointments");
        router.refresh();
      } else if (res.fieldErrors) {
        for (const [key, messages] of Object.entries(res.fieldErrors)) {
          form.setError(key as Parameters<typeof form.setError>[0], {
            message: messages[0],
          });
        }
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <Field
        label="Customer"
        error={errors.customerId?.message}
        htmlFor="customerId"
      >
        <select
          id="customerId"
          className={fieldClass}
          {...form.register("customerId")}
        >
          <option value="">— No customer —</option>
          {props.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField form={form} name="service" label="Service" />
        <TextField form={form} name="staff" label="Assigned staff" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Starts at"
          error={errors.startsAt?.message}
          htmlFor="startsAt"
        >
          <input
            id="startsAt"
            type="datetime-local"
            className={fieldClass}
            {...form.register("startsAt")}
          />
        </Field>
        <Field label="Ends at" error={errors.endsAt?.message} htmlFor="endsAt">
          <input
            id="endsAt"
            type="datetime-local"
            className={fieldClass}
            {...form.register("endsAt")}
          />
        </Field>
      </div>

      <Field label="Status" htmlFor="status">
        <select
          id="status"
          className={fieldClass}
          {...form.register("status")}
        >
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPOINTMENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>

      <TextAreaField form={form} name="notes" label="Notes" />

      <div className="flex flex-wrap items-center gap-4 border-t border-admin-line pt-5">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-admin-accent font-admin-heading tracking-[2px] text-admin-on-accent hover:bg-admin-accent-hover"
        >
          {pending
            ? "SAVING…"
            : props.mode === "edit"
              ? "SAVE CHANGES"
              : "CREATE APPOINTMENT"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/appointments")}
          className="rounded-none border-admin-line text-admin-fg hover:border-admin-accent hover:text-admin-accent"
        >
          Cancel
        </Button>
        {result?.error && (
          <span className="text-sm text-destructive">{result.error}</span>
        )}
        {props.mode === "edit" && (
          <span className="text-xs text-admin-muted">
            Setting status to “Completed” starts the review request.
          </span>
        )}
      </div>
    </form>
  );
}

function toDefaults(appointment?: Appointment): CreateAppointmentInput {
  return {
    customerId: appointment?.customerId ?? "",
    service: appointment?.service ?? "",
    staff: appointment?.staff ?? "",
    status: appointment?.status ?? "scheduled",
    startsAt: appointment?.startsAt ? toLocalInput(appointment.startsAt) : "",
    endsAt: appointment?.endsAt ? toLocalInput(appointment.endsAt) : "",
    notes: appointment?.notes ?? "",
  };
}

/** ISO timestamp → value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
function toLocalInput(iso: string): string {
  return iso.slice(0, 16);
}
