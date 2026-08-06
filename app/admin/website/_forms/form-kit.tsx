"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Controller,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CmsFormState } from "@/features/website-cms/actions";
import { SavedNotice } from "@/components/ui/saved-notice";
import { Spinner } from "@/components/ui/submit-button";

/**
 * Small building blocks shared by every CMS section form. They wrap the shadcn
 * primitives with the admin field styling and read validation errors out of
 * react-hook-form (including nested array paths like `items.0.title`).
 */

export const fieldClass =
  "h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg shadow-none outline-none transition-colors focus-visible:border-admin-accent focus-visible:ring-0";

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-admin-heading text-lg tracking-[2px] text-admin-fg">
      {children}
    </h2>
  );
}

/**
 * Bridges react-hook-form values to a CMS server action: serializes the
 * validated section object to a JSON `content` field and tracks pending/result.
 */
export function useCmsSubmit(action: (fd: FormData) => Promise<CmsFormState>) {
  const [result, setResult] = useState<CmsFormState | null>(null);
  const [pending, start] = useTransition();

  const submit = (values: unknown) => {
    start(async () => {
      const fd = new FormData();
      fd.set("content", JSON.stringify(values));
      setResult(await action(fd));
    });
  };

  return { result, pending, submit };
}

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[0.7rem] font-normal uppercase tracking-[1.5px] text-admin-muted"
      >
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  placeholder,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} error={fieldError(form, name)} htmlFor={name}>
      <Input
        id={name}
        placeholder={placeholder}
        className={fieldClass}
        {...form.register(name)}
      />
    </Field>
  );
}

export function TextAreaField<T extends FieldValues>({
  form,
  name,
  label,
  placeholder,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} error={fieldError(form, name)} htmlFor={name}>
      <Textarea
        id={name}
        placeholder={placeholder}
        className={cn(fieldClass, "min-h-20 resize-y")}
        {...form.register(name)}
      />
    </Field>
  );
}

/**
 * Editor for a simple list of strings (one item per line). RHF's useFieldArray
 * only supports arrays of objects, so primitive lists use this Controller-bound
 * textarea; the schema trims blank lines on validate.
 */
export function StringListField<T extends FieldValues>({
  form,
  name,
  label,
  hint,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  hint?: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <Textarea
            className={cn(fieldClass, "min-h-24 resize-y")}
            value={Array.isArray(field.value) ? field.value.join("\n") : ""}
            onChange={(e) => field.onChange(e.target.value.split("\n"))}
            onBlur={field.onBlur}
          />
          {hint && <span className="text-[0.65rem] text-admin-muted">{hint}</span>}
        </Field>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  form,
  name,
  label,
  min,
  max,
  hint,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <Field label={label} error={fieldError(form, name)} htmlFor={name}>
      <Input
        id={name}
        type="number"
        min={min}
        max={max}
        className={fieldClass}
        // `valueAsNumber` so the schema receives a real number. Without it the
        // input hands over a string and a `z.number()` rejects every save with
        // a message about a type the owner never chose.
        {...form.register(name, { valueAsNumber: true })}
      />
      {hint && <span className="text-[0.65rem] text-admin-muted">{hint}</span>}
    </Field>
  );
}

/**
 * ─── A NOTE ON HIDDEN FIELDS ─────────────────────────────────────────────────
 *
 * Each form renders the inputs THIS tenant's template uses (templates/registry
 * → `fields`), so a barber never sees a "serving size" and a patisserie never
 * sees an icon glyph. Values behind an input that isn't rendered are NOT lost:
 * react-hook-form keeps `defaultValues` for fields that were never registered
 * and includes them in the submitted object (`shouldUnregister` defaults to
 * false). That is what lets a section be edited through a partial form and
 * still round-trip whole — including through a later change of template.
 *
 * The consequence to remember: never construct a form's `defaultValues` from a
 * subset of the stored section. Pass the whole thing, always. And never set
 * `shouldUnregister: true` on a CMS form — tests/cms-form-roundtrip.test.tsx
 * fails immediately if you do, which is the point of it.
 *
 * A hook is not a rendered input, though. `useFieldArray` INITIALISES its field
 * whether or not anything is shown, so a conditional array section belongs in
 * its own component (see about-form's EditorialFields) rather than behind a
 * `{flag && …}` in the parent — otherwise every template writes back an empty
 * array for a section it does not have.
 */

export function CheckField<T extends FieldValues>({
  form,
  name,
  label,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-admin-fg/80">
      <input type="checkbox" className="accent-admin-accent" {...form.register(name)} />
      {label}
    </label>
  );
}

export function RepeatableRow({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded border border-admin-line bg-admin-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.7rem] uppercase tracking-[2px] text-admin-accent">
          {title}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-admin-muted transition-colors hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded border border-dashed border-admin-line py-2 text-xs uppercase tracking-[2px] text-admin-muted transition-colors hover:border-admin-accent hover:text-admin-accent"
    >
      + {children}
    </button>
  );
}

export function SubmitBar({
  pending,
  result,
}: {
  pending: boolean;
  result: CmsFormState | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-admin-line pt-5">
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded-none bg-admin-accent font-admin-heading tracking-[2px] text-admin-on-accent hover:bg-admin-accent-hover"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            SAVING…
          </span>
        ) : (
          "SAVE CHANGES"
        )}
      </Button>
      {/* `result` is a fresh object per save, so it doubles as the token that
          re-shows the message on a repeat save. */}
      <SavedNotice token={result?.success ? result : null}>
        Saved — changes are live.
      </SavedNotice>
      {result?.error && (
        <span className="text-sm text-destructive">{result.error}</span>
      )}
    </div>
  );
}

/** Read a (possibly nested) field's error message from RHF state. */
export function fieldError<T extends FieldValues>(
  form: UseFormReturn<T>,
  name: Path<T>,
): string | undefined {
  let cursor: unknown = form.formState.errors;
  for (const part of String(name).split(".")) {
    if (cursor && typeof cursor === "object") {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  if (cursor && typeof cursor === "object" && "message" in cursor) {
    const message = (cursor as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}
