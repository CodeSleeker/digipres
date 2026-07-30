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
          <SubHeading>Logo</SubHeading>
          <p className="mt-1 text-xs leading-relaxed text-gray">
            Shown in your site header and footer. Leave it empty to use the gold
            initial mark instead. A transparent PNG or an SVG looks best.
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
          <SubHeading>Browser tab icon</SubHeading>
          <p className="mt-1 text-xs leading-relaxed text-gray">
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
          <div className="flex items-center gap-3 text-xs text-gray">
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
          <SubHeading>Wordmark</SubHeading>
          <p className="mt-1 text-xs leading-relaxed text-gray">
            The two-tone business name beside your logo. Leave the first field
            empty to build it from your business name automatically
            {derived && (
              <>
                {" "}
                — currently{" "}
                <span className="text-gold">
                  {derived.namePrimary} {derived.nameAccent}
                </span>
              </>
            )}
            .
          </p>
        </div>
        <TextField
          form={form}
          name="namePrimary"
          label="Primary word (white)"
          placeholder={derived?.namePrimary ?? "RONIE'S"}
        />
        <TextField
          form={form}
          name="nameAccent"
          label="Accent word (gold)"
          placeholder={derived?.nameAccent ?? "BARBER"}
        />
        <TextField
          form={form}
          name="initial"
          label="Initial for the mark"
          placeholder={derived?.initial ?? "R"}
        />
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-dark-border pt-5">
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
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
