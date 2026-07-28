"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactSchema,
  type ContactFormValues,
} from "@/schemas/website-content";
import { saveContact } from "@/features/website-cms/actions";
import {
  AddButton,
  RepeatableRow,
  StringListField,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";

/**
 * Note: LOCATION / HOURS / PHONE / SOCIALS shown on the contact section are
 * derived from the business's scalar fields (phone, address, hours, socials) —
 * edit those on the business profile. This form owns only the section text and
 * the booking dropdown options.
 */
export function ContactForm({
  defaultValues,
}: {
  defaultValues: ContactFormValues;
}) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveContact);
  const serviceOptions = useFieldArray({
    control: form.control,
    name: "serviceOptions",
  });
  const barberOptions = useFieldArray({
    control: form.control,
    name: "barberOptions",
  });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <TextField form={form} name="label" label="Eyebrow label" />
      <TextAreaField form={form} name="intro" label="Intro text" />
      <StringListField
        form={form}
        name="titleLines"
        label="Title lines"
        hint="One line per row."
      />

      <div className="grid gap-3">
        <SubHeading>Service options (booking dropdown)</SubHeading>
        {serviceOptions.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Option ${i + 1}`}
            onRemove={() => serviceOptions.remove(i)}
          >
            <TextField
              form={form}
              name={`serviceOptions.${i}.label`}
              label="Label"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => serviceOptions.append({ label: "" })}>
          Add service option
        </AddButton>
      </div>

      <div className="grid gap-3">
        <SubHeading>Barber options (booking dropdown)</SubHeading>
        {barberOptions.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Option ${i + 1}`}
            onRemove={() => barberOptions.remove(i)}
          >
            <TextField
              form={form}
              name={`barberOptions.${i}.label`}
              label="Label"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => barberOptions.append({ label: "" })}>
          Add barber option
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
