"use client";

import { useRef, useState } from "react";
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_IMAGE_TYPES,
  imageUploadError,
  tenantImageObjectKey,
} from "@/lib/security/media";
import { Field, fieldClass, fieldError } from "./form-kit";
import { Input } from "@/components/ui/input";

const BUCKET = "tenant-media";

/**
 * An image the owner supplies either way: paste a link, or upload from the
 * device they're holding.
 *
 * Upload goes STRAIGHT from the browser to Supabase Storage rather than through
 * a server action — server actions cap request bodies well below a phone photo,
 * and RLS is the real authorization anyway. Migration 0019 scopes writes to
 * `<business_id>/…`, so a crafted key is refused by the database, not by this
 * component.
 */
export function ImageField<T extends FieldValues>({
  form,
  name,
  label,
  businessId,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  /** Null before onboarding creates the business — the object key needs the id,
   *  so only the URL input is offered until then. */
  businessId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = form.watch(name) as string | undefined;

  const onPick = async (file: File | undefined) => {
    if (!file || !businessId) return;
    setError(null);

    const invalid = imageUploadError(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const key = tenantImageObjectKey(
        businessId,
        file.type,
        crypto.randomUUID(),
      );
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(key, file, { contentType: file.type });

      if (uploadError) {
        setError("Upload failed. Check you're still signed in, then try again.");
        return;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
      form.setValue(name, data.publicUrl as PathValue<T, Path<T>>, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      // Clear the picker so choosing the SAME file again still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-2">
      <Field label={label} error={fieldError(form, name)} htmlFor={name}>
        <Input
          id={name}
          placeholder="https://… or upload below"
          className={fieldClass}
          {...form.register(name)}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        {businessId ? (
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            aria-label={`Upload ${label.toLowerCase()}`}
            onChange={(e) => onPick(e.target.files?.[0])}
            disabled={busy}
            className="text-xs text-gray file:mr-3 file:border file:border-dark-border file:bg-dark file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[2px] file:text-gold hover:file:border-gold"
          />
        ) : (
          <p className="text-xs text-gray">
            Finish creating your business profile to upload a photo. You can
            still paste a link above.
          </p>
        )}
        {busy && <span className="text-xs text-gray">Uploading…</span>}
        {current && !busy && (
          /* Plain <img>: this is an admin preview of an arbitrary URL, and
             next/image throws on hosts outside remotePatterns. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt=""
            className="h-12 w-12 border border-dark-border object-cover"
          />
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
