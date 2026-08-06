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
  measureInto,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  /** Null before onboarding creates the business — the object key needs the id,
   *  so only the URL input is offered until then. */
  businessId: string | null;
  /**
   * Where to record the picture's intrinsic size, for layouts that need the
   * real proportions (a masonry). Omitted everywhere else — a fixed-ratio card
   * crops to its frame regardless, so measuring would store a number nothing
   * reads.
   */
  measureInto?: { width: Path<T>; height: Path<T> };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = form.watch(name) as string | undefined;

  /**
   * Record the picture's natural size, if we were asked to and if it loads.
   *
   * Measured from the URL the site will actually serve rather than from the
   * local File, so a pasted link is handled by exactly the same path as an
   * upload — and so a CDN that resizes on delivery is measured as delivered.
   *
   * A failure is silent and clears the pair: the owner did nothing wrong, and a
   * template that wanted the numbers falls back to a fixed ratio. Leaving stale
   * dimensions from a previous image would be the actual bug.
   */
  const measure = (url: string) => {
    if (!measureInto) return;

    const set = (width?: number, height?: number) => {
      form.setValue(measureInto.width, width as PathValue<T, Path<T>>, {
        shouldDirty: true,
      });
      form.setValue(measureInto.height, height as PathValue<T, Path<T>>, {
        shouldDirty: true,
      });
    };

    if (!url.trim()) {
      set(undefined, undefined);
      return;
    }

    const probe = new window.Image();
    probe.onload = () =>
      set(probe.naturalWidth || undefined, probe.naturalHeight || undefined);
    probe.onerror = () => set(undefined, undefined);
    probe.src = url;
  };

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
      measure(data.publicUrl);
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
          {...form.register(name, {
            // On blur, not on every keystroke: a half-typed URL is a request
            // the browser would make and fail, once per character.
            onBlur: (e) => measure(e.target.value),
          })}
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
            className="text-xs text-admin-muted file:mr-3 file:border file:border-admin-line file:bg-admin-panel file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[2px] file:text-admin-accent hover:file:border-admin-accent"
          />
        ) : (
          <p className="text-xs text-admin-muted">
            Finish creating your business profile to upload a photo. You can
            still paste a link above.
          </p>
        )}
        {busy && <span className="text-xs text-admin-muted">Uploading…</span>}
        {current && !busy && (
          /* Plain <img>: this is an admin preview of an arbitrary URL, and
             next/image throws on hosts outside remotePatterns. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt=""
            className="h-12 w-12 border border-admin-line object-cover"
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
