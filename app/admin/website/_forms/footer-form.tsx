"use client";

import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { footerSchema, type FooterFormValues } from "@/schemas/website-content";
import { saveFooter } from "@/features/website-cms/actions";
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
 * Note: footer social icons are derived from the business's Facebook/Instagram
 * fields, not edited here. This form owns the description, link columns, and
 * copyright/credit lines.
 */
export function FooterForm({
  defaultValues,
}: {
  defaultValues: FooterFormValues;
}) {
  const form = useForm<FooterFormValues>({
    resolver: zodResolver(footerSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveFooter);
  const columns = useFieldArray({ control: form.control, name: "columns" });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <TextAreaField form={form} name="description" label="Description" />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField form={form} name="copyright" label="Copyright line" />
        <TextField form={form} name="credit" label="Credit line" />
      </div>

      <div className="grid gap-3">
        <SubHeading>Link columns</SubHeading>
        {columns.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Column ${i + 1}`}
            onRemove={() => columns.remove(i)}
          >
            <TextField
              form={form}
              name={`columns.${i}.title`}
              label="Column title"
            />
            <FooterColumnLinks form={form} columnIndex={i} />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => columns.append({ title: "", links: [] })}>
          Add column
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}

function FooterColumnLinks({
  form,
  columnIndex,
}: {
  form: UseFormReturn<FooterFormValues>;
  columnIndex: number;
}) {
  const links = useFieldArray({
    control: form.control,
    name: `columns.${columnIndex}.links`,
  });

  return (
    <div className="grid gap-2 border-l border-dark-border pl-3">
      {links.fields.map((field, j) => (
        <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <TextField
            form={form}
            name={`columns.${columnIndex}.links.${j}.label`}
            label="Label"
          />
          <TextField
            form={form}
            name={`columns.${columnIndex}.links.${j}.href`}
            label="Link"
          />
          <button
            type="button"
            onClick={() => links.remove(j)}
            className="self-end pb-2 text-xs text-gray transition-colors hover:text-destructive"
          >
            Remove
          </button>
        </div>
      ))}
      <AddButton onClick={() => links.append({ label: "", href: "" })}>
        Add link
      </AddButton>
    </div>
  );
}
