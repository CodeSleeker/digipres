"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactSchema,
  type ContactFormValues,
} from "@/schemas/website-content";
import { saveContact } from "@/features/website-cms/actions";
import type { TemplateFields } from "@/templates/registry";
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
  fields,
}: {
  defaultValues: ContactFormValues;
  fields: TemplateFields;
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

      {/* Both dropdowns belong to an enquiry form. A template that has no such
          form renders neither, and is offered neither — otherwise an owner
          fills in choices that are stored and never shown to anybody. */}
      {fields.bookingOptions && (
        <div className="grid gap-3">
          <SubHeading>Enquiry options (&ldquo;what is this about?&rdquo;)</SubHeading>
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
            Add option
          </AddButton>
        </div>
      )}

      {fields.staffOptions && (
        <div className="grid gap-3">
          {/* "Team member", not "barber": the same dropdown routes to a stylist,
              a therapist or a technician on the next template to want it. The
              stored key stays `barberOptions` — renaming it is a migration, and
              the label is what an owner actually reads. */}
          <SubHeading>Team members (&ldquo;who with?&rdquo;)</SubHeading>
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
            Add team member
          </AddButton>
        </div>
      )}

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
