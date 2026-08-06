"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { RepeatableRow, TextField } from "./form-kit";

/**
 * The optional link set opposite a section heading ("See the full menu →").
 *
 * Only rendered for templates that place one. Clearing the label removes the
 * link entirely rather than publishing an unlabelled arrow — the schema
 * collapses the whole block when the label is blank.
 */
export function HeadingLinkFields<T extends FieldValues>({
  form,
}: {
  form: UseFormReturn<T>;
}) {
  return (
    <RepeatableRow title="Heading link (optional)">
      <TextField
        form={form}
        name={"heading.link.label" as Path<T>}
        label="Label — leave blank for no link"
      />
      <TextField
        form={form}
        name={"heading.link.href" as Path<T>}
        label="Link"
        placeholder="#contact or https://…"
      />
    </RepeatableRow>
  );
}
