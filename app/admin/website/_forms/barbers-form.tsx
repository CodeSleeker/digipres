"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  barbersSchema,
  type BarbersFormValues,
} from "@/schemas/website-content";
import { saveBarbers } from "@/features/website-cms/actions";
import {
  AddButton,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";

/**
 * The team section. Each member's social links are entered as plain profile
 * URLs — the rendered link label and its accessible name are derived when the
 * profile is built, so an owner never types an `aria-label`.
 */
export function BarbersForm({
  defaultValues,
}: {
  defaultValues: BarbersFormValues;
}) {
  const form = useForm<BarbersFormValues>({
    resolver: zodResolver(barbersSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveBarbers);
  const items = useFieldArray({ control: form.control, name: "items" });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <div className="grid gap-3">
        <SubHeading>Heading</SubHeading>
        <TextField form={form} name="heading.label" label="Eyebrow label" />
        <TextField form={form} name="heading.title" label="Title" />
        <TextField form={form} name="heading.subtitle" label="Subtitle" />
      </div>

      <div className="grid gap-3">
        <SubHeading>Team members</SubHeading>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Member ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField form={form} name={`items.${i}.name`} label="Name" />
              <TextField
                form={form}
                name={`items.${i}.role`}
                label="Role (e.g. Senior Barber)"
              />
            </div>
            <TextField form={form} name={`items.${i}.image`} label="Photo URL" />
            <TextAreaField
              form={form}
              name={`items.${i}.bio`}
              label="Short bio"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`items.${i}.instagramUrl`}
                label="Instagram URL (optional)"
                placeholder="https://instagram.com/…"
              />
              <TextField
                form={form}
                name={`items.${i}.facebookUrl`}
                label="Facebook URL (optional)"
                placeholder="https://facebook.com/…"
              />
            </div>
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            items.append({
              name: "",
              role: "",
              bio: "",
              image: "",
              instagramUrl: "",
              facebookUrl: "",
            })
          }
        >
          Add team member
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
