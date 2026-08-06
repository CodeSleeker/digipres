"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "@/types/onboarding";
import type { BusinessCategory, DayHours } from "@/types/business-entity";
import { BUSINESS_CATEGORIES } from "@/schemas/business";
import { SavedNotice } from "@/components/ui/saved-notice";
import { Spinner } from "@/components/ui/submit-button";
import { stepSchemas } from "@/schemas/onboarding";
import {
  saveOnboardingStep,
  type OnboardingSaveResult,
  type OnboardingView,
} from "@/features/onboarding/actions";
import {
  Field,
  TextAreaField,
  TextField,
  fieldClass,
} from "@/app/admin/website/_forms/form-kit";

/**
 * One list, defined next to the validator that enforces it (schemas/business).
 * A second copy here is how a category ends up offered in the form and rejected
 * on save.
 */
const CATEGORIES: readonly BusinessCategory[] = BUSINESS_CATEGORIES;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface WizardValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  addressLocality: string;
  addressRegion: string;
  addressPostalCode: string;
  addressCountry: string;
  category: BusinessCategory;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  googleReviewUrl: string;
  hours: DayHours[];
}

/** Ensure a full Sunday–Saturday schedule for the editor. */
function seedHours(hours: DayHours[]): DayHours[] {
  return Array.from({ length: 7 }, (_, day) => {
    const existing = hours.find((h) => h.day === day);
    return (
      existing ?? {
        day: day as DayHours["day"],
        closed: day === 0,
        open: "09:00",
        close: "17:00",
      }
    );
  });
}

function buildStepData(
  stepId: OnboardingStepId,
  v: WizardValues,
): Record<string, unknown> {
  switch (stepId) {
    case "info":
      return { name: v.name, phone: v.phone, email: v.email };
    case "address":
      return {
        address: v.address,
        addressLocality: v.addressLocality,
        addressRegion: v.addressRegion,
        addressPostalCode: v.addressPostalCode,
        addressCountry: v.addressCountry,
      };
    case "category":
      return { category: v.category };
    case "hours":
      return {
        hours: v.hours.map((h, i) => ({
          day: i,
          closed: Boolean(h.closed),
          open: h.open || null,
          close: h.close || null,
        })),
      };
    case "photos":
      return { logoUrl: v.logoUrl, coverImageUrl: v.coverImageUrl };
    case "description":
      return { description: v.description };
    case "verification":
      return {};
    case "review":
      return { googleReviewUrl: v.googleReviewUrl };
  }
}

export function OnboardingWizard({ view }: { view: OnboardingView }) {
  const form = useForm<WizardValues>({
    defaultValues: {
      name: view.fields.name,
      phone: view.fields.phone,
      email: view.fields.email,
      address: view.fields.address,
      addressLocality: view.fields.addressLocality,
      addressRegion: view.fields.addressRegion,
      addressPostalCode: view.fields.addressPostalCode,
      addressCountry: view.fields.addressCountry,
      category: view.fields.category,
      description: view.fields.description,
      logoUrl: view.fields.logoUrl,
      coverImageUrl: view.fields.coverImageUrl,
      googleReviewUrl: view.fields.googleReviewUrl,
      hours: seedHours(view.fields.hours),
    },
  });

  const [completed, setCompleted] = useState<Set<OnboardingStepId>>(
    new Set(view.completedSteps),
  );
  const [percentage, setPercentage] = useState(view.percentage);
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<OnboardingSaveResult | null>(null);

  const step = ONBOARDING_STEPS[current];

  function goTo(index: number) {
    setCurrent(index);
    setResult(null);
  }

  async function handleSave() {
    setResult(null);
    form.clearErrors();

    const data = buildStepData(step.id, form.getValues());
    const parsed = stepSchemas[step.id].safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const name = issue.path.join(".");
        if (name) {
          form.setError(name as Parameters<typeof form.setError>[0], {
            message: issue.message,
          });
        }
      }
      setResult({ error: "Please fix the highlighted fields." });
      return;
    }

    setSaving(true);
    const fd = new FormData();
    fd.set("step", step.id);
    fd.set("content", JSON.stringify(parsed.data));
    const res = await saveOnboardingStep(fd);
    setSaving(false);
    setResult(res);

    if (res.success) {
      setCompleted((prev) => new Set(prev).add(step.id));
      if (typeof res.percentage === "number") setPercentage(res.percentage);
      if (current < ONBOARDING_STEPS.length - 1) setCurrent(current + 1);
    } else if (res.fieldErrors) {
      for (const [key, messages] of Object.entries(res.fieldErrors)) {
        form.setError(key as Parameters<typeof form.setError>[0], {
          message: messages[0],
        });
      }
    }
  }

  const alreadyDone = completed.has(step.id);

  return (
    <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
      {/* Steps + progress */}
      <aside className="flex flex-col gap-5">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray">
            <span>Setup progress</span>
            <span className="text-gold">{percentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-dark-border">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <ol className="flex flex-col gap-1">
          {ONBOARDING_STEPS.map((s, i) => {
            const done = completed.has(s.id);
            const active = i === current;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-dark text-white"
                      : "text-gray-light hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem]",
                      done
                        ? "bg-gold text-black"
                        : active
                          ? "border border-gold text-gold"
                          : "border border-dark-border text-gray",
                    )}
                  >
                    {done ? "✓" : s.index}
                  </span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* Current step */}
      <section className="min-w-0">
        <div className="mb-6">
          <h2 className="font-heading text-xl tracking-[2px] text-white">
            {step.index}. {step.title}
          </h2>
          <p className="mt-1 text-sm text-gray">{step.blurb}</p>
        </div>

        <div className="grid max-w-xl gap-5">{renderStep(step.id, form)}</div>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-dark-border pt-5">
          <Button
            type="button"
            variant="outline"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
            className="rounded-none border-dark-border text-white hover:border-gold hover:text-gold"
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={saving}
            aria-busy={saving}
            onClick={handleSave}
            className="rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                SAVING…
              </span>
            ) : alreadyDone ? (
              "SAVE CHANGES"
            ) : step.id === "verification" ? (
              "MARK AS DONE"
            ) : (
              "SAVE & CONTINUE"
            )}
          </Button>
          <SavedNotice token={result?.success ? result : null}>Saved.</SavedNotice>
          {result?.error && (
            <span className="text-sm text-destructive">{result.error}</span>
          )}
        </div>
      </section>
    </div>
  );
}

function renderStep(
  stepId: OnboardingStepId,
  form: ReturnType<typeof useForm<WizardValues>>,
) {
  switch (stepId) {
    case "info":
      return (
        <>
          <TextField form={form} name="name" label="Business name" />
          <TextField form={form} name="phone" label="Phone" />
          <TextField form={form} name="email" label="Email" />
        </>
      );
    case "address":
      // Split rather than one box: the city is what lets a search engine or an
      // AI assistant place this business, and neither can pull it reliably out
      // of a free-text line.
      return (
        <>
          <TextAreaField
            form={form}
            name="address"
            label="Street address"
            placeholder="Unit / building / street"
          />
          <TextField
            form={form}
            name="addressLocality"
            label="City / town"
            placeholder="Cagayan de Oro"
          />
          <TextField
            form={form}
            name="addressRegion"
            label="Province / region"
            placeholder="Misamis Oriental"
          />
          <TextField
            form={form}
            name="addressPostalCode"
            label="Postal code"
            placeholder="9000"
          />
          <TextField
            form={form}
            name="addressCountry"
            label="Country code"
            placeholder="PH"
          />
        </>
      );
    case "category":
      return (
        <Field
          label="Primary category"
          error={form.formState.errors.category?.message}
          htmlFor="category"
        >
          <select
            id="category"
            className={cn(fieldClass, "capitalize")}
            {...form.register("category")}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      );
    case "hours":
      return <HoursEditor form={form} />;
    case "photos":
      return (
        <>
          <TextField form={form} name="logoUrl" label="Logo image URL" />
          <TextField
            form={form}
            name="coverImageUrl"
            label="Cover image URL"
          />
          <p className="text-xs text-gray">
            Paste image URLs for now. (Direct file uploads can be added later.)
          </p>
        </>
      );
    case "description":
      return (
        <TextAreaField
          form={form}
          name="description"
          label="Business description"
          placeholder="What makes your business great?"
        />
      );
    case "verification":
      return <VerificationGuide />;
    case "review":
      return (
        <>
          <TextField
            form={form}
            name="googleReviewUrl"
            label="Google review link"
            placeholder="https://g.page/r/..."
          />
          <p className="text-xs text-gray">
            In Google Business Profile → Ask for reviews, copy your short review
            link and paste it here.
          </p>
        </>
      );
  }
}

function HoursEditor({
  form,
}: {
  form: ReturnType<typeof useForm<WizardValues>>;
}) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[100px_auto_1fr_1fr] items-center gap-3"
        >
          <span className="text-sm text-gray-light">{DAY_NAMES[i]}</span>
          <label className="flex items-center gap-2 text-xs text-gray">
            <input
              type="checkbox"
              className="accent-gold"
              {...form.register(`hours.${i}.closed`)}
            />
            Closed
          </label>
          <input
            type="time"
            aria-label={`${DAY_NAMES[i]} opening time`}
            className={fieldClass}
            {...form.register(`hours.${i}.open`)}
          />
          <input
            type="time"
            aria-label={`${DAY_NAMES[i]} closing time`}
            className={fieldClass}
            {...form.register(`hours.${i}.close`)}
          />
        </div>
      ))}
    </div>
  );
}

function VerificationGuide() {
  return (
    <div className="grid gap-4 text-sm leading-relaxed text-gray-light">
      <p>
        Google verifies that you own the business before your profile goes live.
        Follow these steps in your Google Business Profile account:
      </p>
      <ol className="grid list-decimal gap-2 pl-5">
        <li>Sign in to your Google account and search for your business name.</li>
        <li>
          Select <span className="text-gold">Own this business?</span> and choose
          a verification method (postcard, phone, email, or video).
        </li>
        <li>
          For postcard verification, enter the code from the mailer (arrives in
          ~5 days) into your profile.
        </li>
        <li>Once verified, publish your profile and keep details up to date.</li>
      </ol>
      <p className="text-xs text-gray">
        This is a guide only — verification happens on Google, not here. Mark
        this step done once you&apos;ve started the process.
      </p>
    </div>
  );
}
