"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productsSchema,
  type ProductsFormValues,
} from "@/schemas/website-content";
import { saveProducts } from "@/features/website-cms/actions";
import type { TemplateFields } from "@/templates/registry";
import {
  AddButton,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextField,
  useCmsSubmit,
} from "./form-kit";
import { HeadingLinkFields } from "./heading-link-fields";
import { ImageField } from "./image-field";

/**
 * The shop section — retail products on one template, the best-sellers rail on
 * another. See services-form.tsx for how the per-template inputs are decided.
 */
export function ProductsForm({
  defaultValues,
  fields,
  businessId,
}: {
  defaultValues: ProductsFormValues;
  fields: TemplateFields;
  businessId: string | null;
}) {
  const form = useForm<ProductsFormValues>({
    resolver: zodResolver(productsSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveProducts);
  const items = useFieldArray({ control: form.control, name: "items" });

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
        <SubHeading>Products</SubHeading>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Product ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
              {fields.itemIcons && (
                <TextField
                  form={form}
                  name={`items.${i}.icon`}
                  label="Icon"
                  placeholder="🧴"
                />
              )}
              <TextField form={form} name={`items.${i}.name`} label="Name" />
            </div>

            <TextField
              form={form}
              name={`items.${i}.description`}
              label={
                // The rail card prints the qualifier, not this — but the text is
                // real content the record should carry, and it is what a search
                // result or a future listing has to work from.
                fields.itemPhotos
                  ? "Description (kept for listings and search)"
                  : "Description"
              }
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
                  placeholder="Golden butter croissants dusted with icing sugar"
                />
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`items.${i}.price`}
                label="Price"
                placeholder="₱450"
              />
              {fields.itemPhotos ? (
                <TextField
                  form={form}
                  name={`items.${i}.meta`}
                  label="Qualifier"
                  placeholder="Box of 6"
                />
              ) : (
                <TextField
                  form={form}
                  name={`items.${i}.tag`}
                  label="Ribbon (optional)"
                  placeholder="BEST SELLER"
                />
              )}
            </div>
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            items.append({
              icon: "",
              name: "",
              description: "",
              price: "",
              tag: "",
            })
          }
        >
          Add product
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
