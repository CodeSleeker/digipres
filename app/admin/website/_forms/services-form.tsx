"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  servicesSchema,
  type ServicesFormValues,
} from "@/schemas/website-content";
import { saveServices } from "@/features/website-cms/actions";
import {
  AddButton,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";

export function ServicesForm({
  defaultValues,
}: {
  defaultValues: ServicesFormValues;
}) {
  const form = useForm<ServicesFormValues>({
    resolver: zodResolver(servicesSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveServices);
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
        <SubHeading>Services</SubHeading>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Service ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`items.${i}.icon`}
                label="Icon (glyph)"
              />
              <TextField form={form} name={`items.${i}.title`} label="Title" />
            </div>
            <TextAreaField
              form={form}
              name={`items.${i}.description`}
              label="Description"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`items.${i}.price`}
                label="Price (e.g. ₱250)"
              />
              <TextField
                form={form}
                name={`items.${i}.unit`}
                label="Unit (e.g. / session)"
              />
            </div>
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            items.append({
              icon: "",
              title: "",
              description: "",
              price: "",
              unit: "",
            })
          }
        >
          Add service
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
