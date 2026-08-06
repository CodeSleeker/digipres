"use client";

import { Controller, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Field, fieldClass } from "./form-kit";

/**
 * The proof strip's customer portraits: a list of image URLs, one per line.
 *
 * A textarea rather than repeated upload fields because these are decorative
 * thumbnails shown at 38px — the owner is pasting four links, not curating a
 * gallery, and four upload widgets would be more chrome than content. No alt
 * text is collected on purpose: the sentence beside the faces carries the
 * claim, so the template renders them `aria-hidden`.
 */
export function AvatarListField<T extends FieldValues>({
  form,
  name,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const urls: string[] = Array.isArray(field.value) ? field.value : [];
        return (
          <Field label="Customer photos" error={fieldState.error?.message}>
            <Textarea
              className={cn(fieldClass, "min-h-20 resize-y")}
              placeholder="https://…"
              value={urls.join("\n")}
              onChange={(e) => field.onChange(e.target.value.split("\n"))}
              onBlur={field.onBlur}
            />
            <span className="text-[0.65rem] text-admin-muted">
              One image URL per line, up to six. Leave blank for no faces.
            </span>
            {urls.filter(Boolean).length > 0 && (
              <div className="mt-1 flex gap-1">
                {urls.filter(Boolean).map((url) => (
                  /* Plain <img>: an admin preview of an arbitrary URL, and
                     next/image throws on hosts outside remotePatterns. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-8 w-8 rounded-full border border-admin-line object-cover"
                  />
                ))}
              </div>
            )}
          </Field>
        );
      }}
    />
  );
}
