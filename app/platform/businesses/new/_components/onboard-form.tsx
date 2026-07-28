"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  onboardBusiness,
  type OnboardState,
} from "@/features/platform/onboarding";
import { TEMPLATES, DEFAULT_TEMPLATE_CODE } from "@/templates/registry";
import { Button } from "@/components/ui/button";

const fieldClass =
  "h-auto w-full rounded-none border border-dark-border bg-charcoal px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold";

export function OnboardForm() {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(
    onboardBusiness,
    {},
  );

  if (state.success) {
    return (
      <div className="border border-dark-border bg-dark p-6 text-sm">
        <p className="text-[#6cbf84]">Business created.</p>
        <p className="mt-2 text-gray-light">
          An invite was emailed to the owner — they set their own password, then
          finish setup in their back office. The site is at{" "}
          <span className="font-mono text-gold">/s/{state.slug}</span>.
        </p>
        <div className="mt-6 flex gap-4 text-xs uppercase tracking-[2px]">
          <Link
            href={`/platform/businesses/${state.businessId}`}
            className="text-gold hover:text-gold-light"
          >
            View business →
          </Link>
          <Link href="/platform/businesses" className="text-gray hover:text-gold">
            All businesses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      <Field label="Business name" error={state.fieldErrors?.businessName}>
        <input
          name="businessName"
          required
          placeholder="Ronies Barber"
          className={fieldClass}
        />
      </Field>

      <Field label="Owner email" error={state.fieldErrors?.ownerEmail}>
        <input
          name="ownerEmail"
          type="email"
          required
          placeholder="owner@business.com"
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-gray">
          They receive an invite link and choose their own password.
        </p>
      </Field>

      <Field label="Slug (optional)" error={state.fieldErrors?.slug}>
        <input name="slug" placeholder="ronies" className={fieldClass} />
        <p className="mt-1 text-xs text-gray">
          Derived from the name if left blank. Used for the site URL.
        </p>
      </Field>

      <Field label="Template" error={state.fieldErrors?.templateCode}>
        <select
          name="templateCode"
          defaultValue={DEFAULT_TEMPLATE_CODE}
          className={fieldClass}
        >
          {TEMPLATES.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Theme" error={state.fieldErrors?.themeCode}>
        <select name="themeCode" defaultValue="default" className={fieldClass}>
          {TEMPLATES.flatMap((t) => t.themes).map((theme) => (
            <option key={theme.code} value={theme.code}>
              {theme.name}
            </option>
          ))}
        </select>
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
      >
        {pending ? "CREATING…" : "CREATE BUSINESS & INVITE OWNER"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.7rem] uppercase tracking-[1.5px] text-gray">
        {label}
      </span>
      {children}
      {error?.[0] && <span className="text-xs text-destructive">{error[0]}</span>}
    </label>
  );
}
