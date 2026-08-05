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
import { ImageField } from "./image-field";

export function GalleryForm({
  defaultValues,
  businessId,
}: {
  defaultValues: GalleryFormValues;
  businessId: string | null;
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
        <p className="text-xs leading-relaxed text-gray">
          &ldquo;Describe the photo&rdquo; is read aloud to visitors using a
          screen reader and is what image search indexes. Say what is actually
          in the shot, not what the piece is called — the title is already on
          screen beside it.
        </p>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Item ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <ImageField
              form={form}
              name={`items.${i}.image`}
              label="Photo"
              businessId={businessId}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField form={form} name={`items.${i}.title`} label="Title" />
              <TextField
                form={form}
                name={`items.${i}.by`}
                label="Credit (e.g. By Ronie)"
              />
            </div>
            <TextField
              form={form}
              name={`items.${i}.caption`}
              label="Caption (optional)"
              placeholder="Happy client — fresh skin fade"
            />
            <TextField
              form={form}
              name={`items.${i}.alt`}
              label="Describe the photo"
              placeholder="Close-up of a high skin fade, tapered to the neckline"
            />
            <CheckField
              form={form}
              name={`items.${i}.wide`}
              label="Wide (spans two columns)"
            />
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            items.append({
              title: "",
              by: "",
              caption: "",
              image: "",
              alt: "",
              wide: false,
            })
          }
        >
          Add gallery item
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
