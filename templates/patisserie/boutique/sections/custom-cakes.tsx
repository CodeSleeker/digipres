"use client";

import { Fragment } from "react";
import type { BusinessProfile } from "@/types/business";
import { Frame } from "../components/frame";
import { Eyebrow, SectionTitle } from "../components/section-head";
import { BtnAction } from "../components/buttons";
import { Field, fieldClass, selectClass } from "../components/fields";
import { stagger } from "../lib/reveal";

/**
 * Custom cakes: how the work happens, and a way to start it.
 *
 * The mockup's "check availability" form acknowledged an availability check no
 * booking service performs. It does something real instead: it carries the
 * occasion, date and guest count down to the enquiry form and prefills them, so
 * the reader arrives at the one form that reaches the shop with their answers
 * already in it. Nothing is claimed that isn't done.
 */
export function CustomCakes({ business }: { business: BusinessProfile }) {
  const custom = business.patisserie?.customCakes;
  if (!custom) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (key: string) => (data.get(key)?.toString() ?? "").trim();

    const form = document.querySelector<HTMLFormElement>("#enquiry-form");
    if (!form) return;

    // The occasion goes into the message, not into "what is it for?": those are
    // the shop's OWN options, and writing a value that isn't among them would
    // silently reset the control to its first entry.
    const occasion = value("occasion");
    const servings = value("servings");
    const summary = [
      occasion && `Occasion: ${occasion}.`,
      servings && `About ${servings} servings.`,
    ]
      .filter(Boolean)
      .join(" ");

    selectByLabel(form, "order_type", ["custom", "cake"]);
    setValue(form, "needed_by", value("event_date"));
    setValue(form, "message", summary);

    form.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    form.querySelector<HTMLInputElement>("#c-name")?.focus({
      preventScroll: true,
    });
  }

  return (
    <section id="custom" className="relative py-[var(--pastry-section)]">
      <div className="pastry-shell grid grid-cols-[1fr_1.02fr] items-center gap-[clamp(2.5rem,1rem+5vw,5.5rem)] max-[900px]:grid-cols-1">
        <div className="reveal reveal-from-left relative pb-14 pr-12 max-[900px]:max-w-[520px]">
          <div className="group">
            <Frame
              src={custom.images[0]?.src}
              alt={custom.images[0]?.alt ?? ""}
              sizes="(max-width: 900px) 92vw, 42vw"
              className="aspect-[3/3.6] rounded-[30px] shadow-[var(--pastry-sh-md)]"
            />
          </div>
          {custom.images[1] && (
            <div className="group absolute bottom-0 right-0 w-[56%]">
              <Frame
                src={custom.images[1].src}
                alt={custom.images[1].alt}
                sizes="(max-width: 900px) 50vw, 24vw"
                className="aspect-square rounded-[22px] border-[7px] border-paper shadow-[var(--pastry-sh-lg)]"
              />
            </div>
          )}
          <span className="absolute right-5 top-6 z-[3] rounded-full bg-paper px-4 py-[0.55rem] text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink shadow-[var(--pastry-sh-sm)]">
            {custom.tag}
          </span>
        </div>

        <div>
          <Eyebrow className="reveal">{custom.label}</Eyebrow>
          <SectionTitle className="reveal mt-4">
            {custom.titleLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {i === custom.titleLines.length - 1 &&
                custom.titleLines.length > 1 ? (
                  <span className="font-normal italic">{line}</span>
                ) : (
                  line
                )}
              </Fragment>
            ))}
          </SectionTitle>
          <p
            className="reveal mt-[1.15rem] text-[clamp(1.02rem,0.97rem+0.3vw,1.185rem)] leading-[1.68] text-ink-70 [text-wrap:pretty]"
            style={stagger(2)}
          >
            {custom.intro}
          </p>

          {/* An ordered list because the order is the point — the numbers are
              drawn by a CSS counter so the marker and the semantics can't
              disagree. */}
          <ol
            className="reveal mt-10 list-none p-0 [counter-reset:step]"
            style={stagger(3)}
          >
            {custom.steps.map((step, i) => (
              <li
                key={step.title}
                className={
                  "relative pb-[1.9rem] pl-[3.6rem] [counter-increment:step] " +
                  "before:absolute before:left-0 before:top-[-0.15rem] before:grid before:h-[38px] before:w-[38px] before:place-content-center before:rounded-full before:border before:border-[var(--pastry-line)] before:bg-snow before:font-display before:text-[0.82rem] before:text-ink before:[content:counter(step,decimal-leading-zero)] " +
                  (i === custom.steps.length - 1
                    ? "pb-0"
                    : "after:absolute after:bottom-0.5 after:left-[18.5px] after:top-10 after:w-px after:bg-[linear-gradient(var(--pastry-line),transparent)] after:content-['']")
                }
              >
                <b className="mb-[0.3rem] block font-display text-[1.075rem] font-medium text-ink">
                  {step.title}
                </b>
                <p className="text-[0.9rem]">{step.description}</p>
              </li>
            ))}
          </ol>

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Start a custom cake enquiry"
            className="reveal mt-10 rounded-[22px] border border-[var(--pastry-line-soft)] bg-snow px-[1.6rem] py-6 shadow-[var(--pastry-sh-sm)]"
            style={stagger(4)}
          >
            <div className="mb-4 grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
              <Field id="q-occasion" label="Occasion">
                <select
                  id="q-occasion"
                  name="occasion"
                  defaultValue=""
                  className={selectClass}
                >
                  <option value="">Choose one</option>
                  {custom.occasionOptions.map((option) => (
                    <option key={option.label} value={option.value ?? option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="q-date" label="Event date">
                <input
                  id="q-date"
                  name="event_date"
                  type="date"
                  className={fieldClass}
                />
              </Field>
              <Field id="q-servings" label="Servings">
                <input
                  id="q-servings"
                  name="servings"
                  type="number"
                  min={8}
                  step={1}
                  placeholder="40"
                  inputMode="numeric"
                  className={fieldClass}
                />
              </Field>
            </div>
            <BtnAction type="submit" variant="accent" arrow className="w-full">
              {custom.submitLabel}
            </BtnAction>
            <p className="mt-[0.9rem] text-[0.875rem] text-ink-45">
              {custom.note}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

/**
 * Write a value into the enquiry form and tell the browser it changed.
 *
 * The `input` event matters: the field is uncontrolled, but anything listening
 * (validation, an analytics hook) would otherwise never learn a value appeared.
 */
function setValue(form: HTMLFormElement, name: string, value: string) {
  if (!value) return;
  const field = form.elements.namedItem(name);
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/**
 * Pick the option whose text contains every keyword.
 *
 * The enquiry form's choices are the tenant's own words — "Custom cake" for one
 * shop, "Bespoke order" for another — so the selection is made by matching
 * rather than by writing a literal that only fits the demo content. No match
 * leaves the control alone, which is the right outcome: a wrong selection is
 * worse than none.
 */
function selectByLabel(
  form: HTMLFormElement,
  name: string,
  keywords: string[],
) {
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLSelectElement)) return;

  const match = Array.from(field.options).find((option) =>
    keywords.every((word) => option.text.toLowerCase().includes(word)),
  );
  if (!match) return;
  field.value = match.value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}
