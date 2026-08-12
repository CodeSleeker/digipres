"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateBusiness } from "@/features/business/actions";
import type { BusinessFormState } from "@/features/business/actions";
import { deriveBrand } from "@/lib/website/build-profile";
import { generatedIconHref } from "@/lib/tenant/icons";
import { ImageField } from "../../website/_forms/image-field";
import { SubHeading, TextField } from "../../website/_forms/form-kit";
import { Button } from "@/components/ui/button";
import { SavedNotice } from "@/components/ui/saved-notice";
import { Spinner } from "@/components/ui/submit-button";

/**
 * Blank is allowed everywhere here — each empty field means "fall back", not
 * "invalid" — so validation is deliberately thin. The real rules (URL scheme,
 * length) live in schemas/business.ts and run again on the server.
 */
const schema = z.object({
  logoUrl: z.string().trim(),
  wordmarkUrl: z.string().trim(),
  faviconUrl: z.string().trim(),
  namePrimary: z.string().trim().max(40),
  nameAccent: z.string().trim().max(40),
  initial: z.string().trim().max(2),
});

type Values = z.infer<typeof schema>;

export function BrandingForm({
  businessId,
  businessName,
  defaultValues,
}: {
  businessId: string | null;
  /** Used to show what the wordmark becomes if the override is left blank. */
  businessName: string;
  defaultValues: Values;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const [result, setResult] = useState<BusinessFormState | null>(null);
  const [pending, start] = useTransition();

  const submit = (values: Values) => {
    start(async () => {
      const fd = new FormData();
      fd.set("logoUrl", values.logoUrl);
      fd.set("wordmarkUrl", values.wordmarkUrl);
      fd.set("faviconUrl", values.faviconUrl);
      // An empty primary word clears the override entirely, which is what puts
      // the wordmark back on the derived-from-name path. Sending the object
      // with a blank primary would instead fail validation.
      fd.set(
        "brand",
        values.namePrimary
          ? JSON.stringify({
              namePrimary: values.namePrimary,
              nameAccent: values.nameAccent,
              initial: values.initial,
            })
          : "",
      );
      setResult(await updateBusiness({}, fd));
    });
  };

  const derived = deriveBrand(businessName);
  // `useWatch`, not `form.watch()`: the latter returns a fresh function/object
  // on every render, which the React Compiler refuses to memoize (it bails out
  // of optimizing the whole component). This subscribes to just these fields.
  const [logoUrl, faviconUrl, namePrimary, initial] = useWatch({
    control: form.control,
    name: ["logoUrl", "faviconUrl", "namePrimary", "initial"],
  });
  const previewInitial =
    initial || namePrimary[0]?.toUpperCase() || derived?.initial || "?";

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-10">
      <section className="grid gap-4">
        <div>
          <SubHeading>Logo mark</SubHeading>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">
            {/* Was "the gold initial mark" on "a dark header" — both true of
                the barber template only. The advice that matters is the same
                for every theme: a transparent background can't clash with one. */}
            The symbol shown in your site header, beside your name. Leave it
            empty and your template falls back to its own initial mark. A
            transparent PNG works best — saved on a solid background it shows as
            a coloured box against your header. Around
            176&nbsp;&times;&nbsp;176 pixels is plenty.
          </p>
        </div>
        <ImageField
          form={form}
          name="logoUrl"
          label="Logo image"
          businessId={businessId}
        />
      </section>

      <section className="grid gap-4">
        <div>
          <SubHeading>Name image</SubHeading>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">
            Optional. Upload your business name as an image when it&apos;s set
            in a specific typeface — we&apos;ll show it instead of the text
            version. If your logo is a single piece with the name already in it,
            put that here and leave the logo mark empty, so the name
            doesn&apos;t appear twice. Transparent PNG, around
            448&nbsp;&times;&nbsp;64 pixels.
          </p>
        </div>
        <ImageField
          form={form}
          name="wordmarkUrl"
          label="Name image"
          businessId={businessId}
        />
      </section>

      <section className="grid gap-4">
        <div>
          <SubHeading>Browser tab icon</SubHeading>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">
            The small icon in the browser tab. Leave it empty and we use your
            logo; with no logo either, we generate a tile from your initial.
            Square images work best — a wide logo gets squashed at 16 pixels.
          </p>
        </div>
        <ImageField
          form={form}
          name="faviconUrl"
          label="Icon image"
          businessId={businessId}
        />
        {!faviconUrl && !logoUrl && (
          <div className="flex items-center gap-3 text-xs text-admin-muted">
            <span>Currently generated:</span>
            {/* The generated tile is our own SVG endpoint, not a tenant upload,
                so a plain <img> at a fixed size is all it needs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedIconHref(previewInitial)}
              alt={`Generated tab icon showing the letter ${previewInitial}`}
              className="h-8 w-8"
            />
          </div>
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <SubHeading>Wordmark text</SubHeading>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">
            The two-tone business name beside your logo, used when no name image
            is uploaded above. Leave the first field empty to build it from your
            business name automatically
            {derived && (
              <>
                {" "}
                — currently{" "}
                <span className="text-admin-accent">
                  {derived.namePrimary} {derived.nameAccent}
                </span>
              </>
            )}
            .
          </p>
        </div>
        {/*
         * Labels describe the ROLE of each word, not how it is painted.
         *
         * They used to read "(white)" and "(gold)", which is the barber theme —
         * the patisserie sets its accent in mint and pink, and the retreat
         * letterspaces one colour across both. An owner reading "gold" on an
         * ivory site is being told something untrue about their own page.
         *
         * The fallback placeholders are neutral for the same reason the name
         * field's is: `derived` normally supplies the tenant's own words, and
         * when it can't, another client's name is the wrong thing to suggest.
         */}
        <TextField
          form={form}
          name="namePrimary"
          label="Primary word"
          placeholder={derived?.namePrimary ?? "FIRST WORD"}
        />
        <TextField
          form={form}
          name="nameAccent"
          label="Accent word — your template styles this one differently"
          placeholder={derived?.nameAccent ?? "SECOND WORD"}
        />
        <TextField
          form={form}
          name="initial"
          label="Initial for the mark"
          placeholder={derived?.initial ?? "A"}
        />
      </section>

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
            "SAVE BRANDING"
          )}
        </Button>
        <SavedNotice token={result?.success ? result : null}>
          Saved — changes are live.
        </SavedNotice>
        {result?.error && (
          <span className="text-sm text-destructive">{result.error}</span>
        )}
        {result?.fieldErrors && (
          <span className="text-sm text-destructive">
            {Object.values(result.fieldErrors)[0]?.[0]}
          </span>
        )}
      </div>
    </form>
  );
}
