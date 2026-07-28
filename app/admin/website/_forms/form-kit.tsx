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

/**
 * Small building blocks shared by every CMS section form. They wrap the shadcn
 * primitives with the admin field styling and read validation errors out of
 * react-hook-form (including nested array paths like `items.0.title`).
 */

export const fieldClass =
  "h-auto w-full rounded-none border border-dark-border bg-charcoal px-3 py-2 text-sm text-white shadow-none outline-none transition-colors focus-visible:border-gold focus-visible:ring-0";

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-heading text-lg tracking-[2px] text-white">
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
        className="text-[0.7rem] font-normal uppercase tracking-[1.5px] text-gray"
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
          {hint && <span className="text-[0.65rem] text-gray">{hint}</span>}
        </Field>
      )}
    />
  );
}

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
    <label className="flex items-center gap-2 text-sm text-gray-light">
      <input type="checkbox" className="accent-gold" {...form.register(name)} />
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
    <div className="rounded border border-dark-border bg-dark p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.7rem] uppercase tracking-[2px] text-gold">
          {title}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-gray transition-colors hover:text-destructive"
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
      className="w-full rounded border border-dashed border-dark-border py-2 text-xs uppercase tracking-[2px] text-gray transition-colors hover:border-gold hover:text-gold"
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
    <div className="flex flex-wrap items-center gap-4 border-t border-dark-border pt-5">
      <Button
        type="submit"
        disabled={pending}
        className="rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
      >
        {pending ? "SAVING…" : "SAVE CHANGES"}
      </Button>
      {result?.success && (
        <span className="text-sm text-[#5bbf7b]">Saved — changes are live.</span>
      )}
      {result?.error && (
        <span className="text-sm text-destructive">{result.error}</span>
      )}
    </div>
  );
}

/** Read a (possibly nested) field's error message from RHF state. */
function fieldError<T extends FieldValues>(
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
