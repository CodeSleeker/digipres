"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  onboardBusiness,
  type OnboardState,
} from "@/features/platform/onboarding";
import {
  TEMPLATES,
  DEFAULT_TEMPLATE_CODE,
  findTemplate,
} from "@/templates/registry";
import { Button } from "@/components/ui/button";

const fieldClass =
  "h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none transition-colors focus:border-admin-accent";

export function OnboardForm() {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(
    onboardBusiness,
    {},
  );

  /**
   * A theme code only means something inside its template — "default" is gold
   * on black under the barber and paper on mint under the patisserie. So the
   * theme list follows the chosen template rather than being the union of every
   * template's themes, which offered two identically-valued options with
   * different names and left the operator picking between them for no effect.
   */
  const [templateCode, setTemplateCode] = useState(DEFAULT_TEMPLATE_CODE);
  const themes = findTemplate(templateCode)?.themes ?? [];

  if (state.success) {
    return (
      <div className="border border-admin-line bg-admin-panel p-6 text-sm">
        <p className="text-[#6cbf84]">Business created.</p>
        <p className="mt-2 text-admin-fg/80">
          An invite was emailed to the owner — they set their own password, then
          finish setup in their back office. The site is at{" "}
          <span className="font-mono text-admin-accent">/s/{state.slug}</span>.
        </p>
        <div className="mt-6 flex gap-4 text-xs uppercase tracking-[2px]">
          <Link
            href={`/platform/businesses/${state.businessId}`}
            className="text-admin-accent hover:text-admin-accent-hover"
          >
            View business →
          </Link>
          <Link href="/platform/businesses" className="text-admin-muted hover:text-admin-accent">
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
        <p className="mt-1 text-xs text-admin-muted">
          They receive an invite link and choose their own password.
        </p>
      </Field>

      <Field label="Slug (optional)" error={state.fieldErrors?.slug}>
        <input name="slug" placeholder="ronies" className={fieldClass} />
        <p className="mt-1 text-xs text-admin-muted">
          Derived from the name if left blank. Used for the site URL.
        </p>
      </Field>

      <Field label="Template" error={state.fieldErrors?.templateCode}>
        <select
          name="templateCode"
          value={templateCode}
          onChange={(e) => setTemplateCode(e.target.value)}
          className={fieldClass}
        >
          {TEMPLATES.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-admin-muted">
          {findTemplate(templateCode)?.description}
        </p>
      </Field>

      <Field label="Theme" error={state.fieldErrors?.themeCode}>
        {/* Keyed on the template so the browser re-evaluates `defaultValue`
            when the list changes — otherwise switching template leaves the
            previous template's selection in place. */}
        <select
          key={templateCode}
          name="themeCode"
          defaultValue={themes[0]?.code}
          className={fieldClass}
        >
          {themes.map((theme) => (
            <option key={theme.code} value={theme.code}>
              {theme.name}
            </option>
          ))}
        </select>
      </Field>

      {/*
        The newsletter sender, captured here when it is already known.
        Deliberately not required: the DNS records usually do not exist yet at
        the moment a client is created, and nothing sends until the address is
        verified on the business page afterwards.
      */}
      <fieldset className="grid gap-5 border border-admin-line p-4">
        <legend className="px-2 text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
          Newsletter sender (optional)
        </legend>
        <p className="text-xs leading-relaxed text-admin-muted">
          The client sends their weekly digest from their OWN domain, so a
          complaint against their list can never affect another client&apos;s
          booking emails. Add the address here if you know it, then verify it on
          the business page once the DNS records are live. Until it is verified
          there is no signup box on their site and nothing is sent.
        </p>

        <Field
          label="From address"
          error={state.fieldErrors?.newsletterFromEmail}
        >
          <input
            name="newsletterFromEmail"
            type="email"
            placeholder="news@theirbakery.ph"
            className={fieldClass}
          />
        </Field>

        <Field label="From name" error={state.fieldErrors?.newsletterFromName}>
          <input
            name="newsletterFromName"
            placeholder="Desserts by Arah"
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-admin-muted">
            Shown as the sender. Falls back to the business name.
          </p>
        </Field>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-none bg-admin-accent font-admin-heading tracking-[2px] text-admin-on-accent hover:bg-admin-accent-hover"
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
      <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
        {label}
      </span>
      {children}
      {error?.[0] && <span className="text-xs text-destructive">{error[0]}</span>}
    </label>
  );
}
