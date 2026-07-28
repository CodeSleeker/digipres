"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  gallerySchema,
  type GalleryFormValues,
} from "@/schemas/website-content";
import { saveGallery } from "@/features/website-cms/actions";
import {
  AddButton,
  CheckField,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextField,
  useCmsSubmit,
} from "./form-kit";

export function GalleryForm({
  defaultValues,
}: {
  defaultValues: GalleryFormValues;
}) {
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(gallerySchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveGallery);
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
        <SubHeading>Gallery items</SubHeading>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Item ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <TextField form={form} name={`items.${i}.image`} label="Image URL" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField form={form} name={`items.${i}.title`} label="Title" />
              <TextField
                form={form}
                name={`items.${i}.by`}
                label="Credit (e.g. By Ronie)"
              />
            </div>
            <CheckField
              form={form}
              name={`items.${i}.wide`}
              label="Wide (spans two columns)"
            />
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            items.append({ title: "", by: "", image: "", wide: false })
          }
        >
          Add gallery item
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
