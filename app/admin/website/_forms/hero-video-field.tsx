"use client";

import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_VIDEO_TYPES,
  heroVideoObjectKey,
  videoUploadError,
} from "@/lib/security/media";
import type { HeroFormValues } from "@/schemas/website-content";

const BUCKET = "tenant-media";

/**
 * Supplies the hero scroll-scrub video: upload a file, or paste a URL.
 *
 * The upload goes STRAIGHT from the browser to Supabase Storage rather than
 * through a server action — server actions cap request bodies well below a
 * typical video, and routing megabytes through the server buys nothing here.
 * Migration 0019's RLS is what enforces tenancy: the object key starts with the
 * business id and an owner can only write under their own folder, so a crafted
 * key is rejected by the database, not by this component.
 */
export function HeroVideoField({
  form,
  businessId,
}: {
  form: UseFormReturn<HeroFormValues>;
  /** Null before onboarding creates the business — uploads need the id for the
   *  object key, so only the URL field is offered until then. */
  businessId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const current = form.watch("heroVideoUrl");
  const media = form.watch("heroMedia") ?? "frames";

  const onPick = async (file: File | undefined) => {
    if (!file || !businessId) return;
    setError(null);
    setNote(null);

    // Cheap client-side guardrails; the real limits are the bucket's.
    const invalid = videoUploadError(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const key = heroVideoObjectKey(businessId, file.name);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(key, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError(
          "Upload failed. Check you're still signed in, then try again.",
        );
        return;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
      // Cache-bust: the key is stable, so a replacement would otherwise be
      // masked by the CDN copy of the previous video.
      const url = `${data.publicUrl}?v=${Date.now()}`;

      form.setValue("heroVideoUrl", url, { shouldDirty: true });
      form.setValue("heroMedia", "video", { shouldDirty: true });
      setNote("Uploaded. Save the section to publish it.");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-3 border border-admin-line p-4">
      <div>
        <p className="text-sm text-admin-fg">Hero scroll-scrub</p>
        <p className="mt-1 text-xs leading-relaxed text-admin-muted">
          Scrolling the hero plays the cut. Use the template&apos;s built-in
          frame sequence, or supply your own video.
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="sr-only">Scrub source</legend>
        {(
          [
            ["frames", "Template frames (built in)"],
            ["video", "My video"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value={value}
              checked={media === value}
              onChange={() =>
                form.setValue("heroMedia", value, { shouldDirty: true })
              }
              className="accent-admin-accent"
            />
            <span className={media === value ? "text-admin-fg" : "text-admin-muted"}>
              {label}
            </span>
          </label>
        ))}
      </fieldset>

      {media === "video" && (
        <div className="grid gap-3 border-t border-admin-line pt-3">
          <div className="grid gap-1.5">
            <label
              htmlFor="heroVideoUrl"
              className="text-[0.7rem] uppercase tracking-[2px] text-admin-muted"
            >
              Video URL
            </label>
            <input
              id="heroVideoUrl"
              type="url"
              placeholder="https://…/clip.mp4"
              {...form.register("heroVideoUrl")}
              className="w-full border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg focus-visible:border-admin-accent focus-visible:outline-none"
            />
            <p className="text-xs text-admin-muted">
              Paste an MP4/WebM link, or upload a file below. Leave blank to use
              the template&apos;s video.
            </p>
            {form.formState.errors.heroVideoUrl && (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.heroVideoUrl.message}
              </p>
            )}
          </div>

          {businessId ? (
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_VIDEO_TYPES.join(",")}
                onChange={(e) => onPick(e.target.files?.[0])}
                disabled={busy}
                className="text-xs text-admin-muted file:mr-3 file:border file:border-admin-line file:bg-admin-panel file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[2px] file:text-admin-accent hover:file:border-admin-accent"
              />
              {busy && <span className="text-xs text-admin-muted">Uploading…</span>}
            </div>
          ) : (
            <p className="text-xs text-admin-muted">
              Finish creating your business profile to upload a file. You can
              still paste a URL above.
            </p>
          )}

          {current && !busy && (
            <video
              src={current}
              muted
              playsInline
              controls
              preload="metadata"
              className="max-h-40 w-full max-w-sm border border-admin-line bg-admin"
            />
          )}

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {note && <p className="text-xs text-[#6cbf84]">{note}</p>}
        </div>
      )}
    </div>
  );
}
