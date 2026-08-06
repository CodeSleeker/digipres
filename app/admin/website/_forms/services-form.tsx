"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  servicesSchema,
  type ServicesFormValues,
} from "@/schemas/website-content";
import { saveServices } from "@/features/website-cms/actions";
import type { TemplateFields } from "@/templates/registry";
import {
  AddButton,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";
import { HeadingLinkFields } from "./heading-link-fields";
import { ImageField } from "./image-field";

/**
 * The services section — grooming services on one template, a dessert menu on
 * another. Which inputs appear is declared by the tenant's template; see the
 * note on hidden fields in form-kit.tsx for why the rest still round-trip.
 */
export function ServicesForm({
  defaultValues,
  fields,
  businessId,
}: {
  defaultValues: ServicesFormValues;
  fields: TemplateFields;
  businessId: string | null;
}) {
  const form = useForm<ServicesFormValues>({
    resolver: zodResolver(servicesSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveServices);
  const items = useFieldArray({ control: form.control, name: "items" });

  const noun = fields.itemPhotos ? "Item" : "Service";

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <div className="grid gap-3">
        <SubHeading>Heading</SubHeading>
        <TextField form={form} name="heading.label" label="Eyebrow label" />
        <TextField form={form} name="heading.title" label="Title" />
        <TextField form={form} name="heading.subtitle" label="Subtitle" />
        {fields.headingLinks && <HeadingLinkFields form={form} />}
      </div>

      <div className="grid gap-3">
        <SubHeading>{fields.itemPhotos ? "Menu" : "Services"}</SubHeading>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`${noun} ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.itemIcons && (
                <TextField
                  form={form}
                  name={`items.${i}.icon`}
                  label="Icon (glyph)"
                />
              )}
              <TextField form={form} name={`items.${i}.title`} label="Title" />
              {fields.itemPhotos && (
                <TextField
                  form={form}
                  name={`items.${i}.tag`}
                  label="Badge (e.g. Signature)"
                />
              )}
            </div>

            <TextAreaField
              form={form}
              name={`items.${i}.description`}
              label="Description"
            />

            {fields.itemPhotos && (
              <>
                <ImageField
                  form={form}
                  name={`items.${i}.image`}
                  label="Photograph"
                  businessId={businessId}
                />
                <TextField
                  form={form}
                  name={`items.${i}.imageAlt`}
                  label="Describe the photograph"
                  placeholder="A slice of pistachio layer cake plated on dark ceramic"
                />
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`items.${i}.price`}
                label="Price (e.g. ₱250)"
              />
              <TextField
                form={form}
                name={`items.${i}.unit`}
                label={fields.itemPhotos ? "Unit (e.g. whole)" : "Unit (e.g. / session)"}
              />
            </div>

            {fields.itemPhotos && (
              <TextField
                form={form}
                name={`items.${i}.meta`}
                label="Serving note (e.g. Serves 12–14)"
              />
            )}
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
          Add {noun.toLowerCase()}
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
