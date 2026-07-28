"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  createCustomerSchema,
  type CreateCustomerInput,
} from "@/schemas/customer";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABEL,
  SMS_STATUSES,
  SMS_STATUS_LABEL,
  type Customer,
} from "@/types/customer";
import {
  createCustomer,
  updateCustomer,
  type CustomerFormState,
} from "@/features/customers/actions";
import {
  Field,
  StringListField,
  TextAreaField,
  TextField,
  fieldClass,
} from "@/app/admin/website/_forms/form-kit";

type Props =
  | { mode: "create"; customer?: undefined }
  | { mode: "edit"; customer: Customer };

export function CustomerForm(props: Props) {
  const router = useRouter();
  const [result, setResult] = useState<CustomerFormState | null>(null);
  const [pending, start] = useTransition();

  const form = useForm<CreateCustomerInput>({
    // Cast bridges the schema's input type (preprocess widens to unknown) and
    // its output type, which is what the form fields use.
    resolver: zodResolver(
      createCustomerSchema,
    ) as unknown as Resolver<CreateCustomerInput>,
    defaultValues: toDefaults(props.customer),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    start(async () => {
      const fd = new FormData();
      fd.set("content", JSON.stringify(values));
      if (props.mode === "edit") fd.set("id", props.customer.id);
      const res =
        props.mode === "edit"
          ? await updateCustomer(fd)
          : await createCustomer(fd);
      setResult(res);
      if (res.success) {
        router.push("/admin/customers");
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
      <TextField form={form} name="name" label="Name" />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField form={form} name="mobile" label="Mobile" />
        <TextField form={form} name="email" label="Email" />
      </div>
      <TextAreaField form={form} name="address" label="Address" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Last visit"
          error={errors.lastVisit?.message}
          htmlFor="lastVisit"
        >
          <input
            id="lastVisit"
            type="date"
            className={fieldClass}
            {...form.register("lastVisit")}
          />
        </Field>
        <TextField form={form} name="preferredStaff" label="Preferred staff" />
      </div>
      <StringListField
        form={form}
        name="servicesAvailed"
        label="Services availed"
        hint="One service per line."
      />
      <TextAreaField form={form} name="notes" label="Notes" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Review status" htmlFor="reviewStatus">
          <select
            id="reviewStatus"
            className={fieldClass}
            {...form.register("reviewStatus")}
          >
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REVIEW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="SMS status" htmlFor="smsStatus">
          <select
            id="smsStatus"
            className={fieldClass}
            {...form.register("smsStatus")}
          >
            {SMS_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SMS_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-dark-border pt-5">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
        >
          {pending
            ? "SAVING…"
            : props.mode === "edit"
              ? "SAVE CHANGES"
              : "ADD CUSTOMER"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/customers")}
          className={cn(
            "rounded-none border-dark-border text-white hover:border-gold hover:text-gold",
          )}
        >
          Cancel
        </Button>
        {result?.error && (
          <span className="text-sm text-destructive">{result.error}</span>
        )}
      </div>
    </form>
  );
}

function toDefaults(customer?: Customer): CreateCustomerInput {
  return {
    name: customer?.name ?? "",
    mobile: customer?.mobile ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    lastVisit: customer?.lastVisit ?? "",
    preferredStaff: customer?.preferredStaff ?? "",
    servicesAvailed: customer?.servicesAvailed ?? [],
    notes: customer?.notes ?? "",
    reviewStatus: customer?.reviewStatus ?? "pending",
    smsStatus: customer?.smsStatus ?? "not_sent",
  };
}
