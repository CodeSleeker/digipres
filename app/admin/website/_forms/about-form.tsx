"use client";

import { useMemo } from "react";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  aboutSchemaFor,
  type AboutFormValues,
} from "@/schemas/website-content";
import { saveAbout } from "@/features/website-cms/actions";
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
import { ImageField } from "./image-field";

export function AboutForm({
  defaultValues,
  fields,
  businessId,
}: {
  defaultValues: AboutFormValues;
  fields: TemplateFields;
  businessId: string | null;
}) {
  /*
   * Validated against the same rules the save action will apply.
   *
   * The button and the badge are required only where the template renders
   * them; demanding them here as well would fail a form that never showed the
   * inputs, with an error pointing at a field the owner cannot see.
   */
  const schema = useMemo(() => aboutSchemaFor(fields), [fields]);

  const form = useForm<AboutFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveAbout);

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <TextField form={form} name="label" label="Eyebrow label" />
      <TextAreaField
        form={form}
        name="text"
        label={fields.aboutEditorial ? "Opening paragraph" : "Body text"}
      />
      {fields.aboutEditorial && (
        <StringListField
          form={form}
          name="paragraphs"
          label="Further paragraphs"
          hint="One paragraph per row. Blank rows are dropped."
        />
      )}
      <ImageField
        form={form}
        name="image"
        label="Image"
        businessId={businessId}
      />
      <TextField
        form={form}
        name="imageAlt"
        label="Describe the image (optional)"
        placeholder="The shop floor with three barber chairs and a client mid-cut"
      />
      {fields.aboutBadge && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} name="badgeValue" label="Badge value" />
          <TextField form={form} name="badgeLabel" label="Badge label" />
        </div>
      )}

      <StringListField
        form={form}
        name="titleLines"
        label="Title lines"
        hint="One line per row."
      />
      {fields.aboutFeatures && (
        <StringListField
          form={form}
          name="features"
          label="Features"
          hint="One feature per row."
        />
      )}

      {fields.aboutEditorial && <EditorialFields form={form} />}

      {fields.aboutCta && (
        <div className="grid gap-3">
          <SubHeading>Button</SubHeading>
          <RepeatableRow title="Call to action">
            <TextField form={form} name="cta.label" label="Label" />
            <TextField form={form} name="cta.href" label="Link" />
          </RepeatableRow>
        </div>
      )}

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}

/**
 * The figures row and the sign-off.
 *
 * A separate component so that `useFieldArray` runs only when the section is
 * actually offered. A hook cannot be conditional, and calling it in the parent
 * would INITIALISE `stats` to an empty array for every template — writing a
 * field the template never declared back into its content on the next save.
 * Small, but it is precisely what the `fields` mechanism exists to prevent.
 */
function EditorialFields({ form }: { form: UseFormReturn<AboutFormValues> }) {
  const stats = useFieldArray({ control: form.control, name: "stats" });

  return (
    <>
      <div className="grid gap-3">
        <SubHeading>Figures</SubHeading>
        {stats.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Figure ${i + 1}`}
            onRemove={() => stats.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`stats.${i}.value`}
                label="Value"
                placeholder="3,400+"
              />
              <TextField
                form={form}
                name={`stats.${i}.label`}
                label="Label"
                placeholder="Cakes delivered"
              />
            </div>
          </RepeatableRow>
        ))}
        <AddButton onClick={() => stats.append({ value: "", label: "" })}>
          Add figure
        </AddButton>
      </div>

      <div className="grid gap-3">
        <SubHeading>Sign-off</SubHeading>
        <RepeatableRow title="Signature">
          <TextField
            form={form}
            name="signature.name"
            label="Name — leave blank to hide the sign-off"
            placeholder="Arah"
          />
          <TextField
            form={form}
            name="signature.role"
            label="Role"
            placeholder="Founder and head pastry chef"
          />
        </RepeatableRow>
      </div>
    </>
  );
}
