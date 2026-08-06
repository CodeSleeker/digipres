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
  newsletterEnabled,
}: {
  defaultValues: FooterFormValues;
  /**
   * Whether this tenant's sending domain is verified.
   *
   * The copy is only editable when the box will actually appear. Offering the
   * fields to a tenant with no newsletter would be asking them to write for a
   * form nobody will ever see, and inviting the question "why isn't it there?"
   */
  newsletterEnabled: boolean;
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

      {newsletterEnabled && (
        <div className="grid gap-3">
          <SubHeading>Mailing list sign-up</SubHeading>
          <p className="text-xs leading-relaxed text-admin-muted">
            The block in your footer where visitors join your list. Clearing the
            heading removes it from your site.
          </p>
          <TextField
            form={form}
            name="newsletter.title"
            label="Heading — clear it to remove the block"
            placeholder="The Sunday list"
          />
          <TextAreaField
            form={form}
            name="newsletter.text"
            label="Description"
            placeholder="One email a week: what is coming out of the oven, and what is nearly gone."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              form={form}
              name="newsletter.placeholder"
              label="Field placeholder"
              placeholder="you@example.com"
            />
            <TextField
              form={form}
              name="newsletter.buttonLabel"
              label="Button label"
              placeholder="Join"
            />
          </div>
          <TextField
            form={form}
            name="newsletter.consent"
            label="Consent line"
            placeholder="We'll email you when there's something new. Unsubscribe any time."
          />
          <p className="text-xs leading-relaxed text-admin-muted">
            The consent line is shown beside the field and saved with every
            person who signs up, so their record says exactly what they agreed
            to. Changing it later does not rewrite what earlier subscribers were
            shown.
          </p>
        </div>
      )}

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
    <div className="grid gap-2 border-l border-admin-line pl-3">
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
            className="self-end pb-2 text-xs text-admin-muted transition-colors hover:text-destructive"
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
