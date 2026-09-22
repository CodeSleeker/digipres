"use client";

import { Fragment, useRef, useState } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { cn } from "@/lib/utils";
import { contactLine } from "@/lib/website/contact-line";
import { BtnGold, BtnGoldSubmit, BtnOutline } from "../components/buttons";
import {
  CheckField,
  Field,
  FormMessage,
  fieldClass,
  selectClass,
  textareaClass,
} from "../components/fields";
import { SplitTitle } from "../components/section-head";
import { delay, reveal } from "../lib/reveal";
import {
  submitInquiry,
  validateInquiry,
  type EventInquiry,
} from "../lib/inquiry";
import {
  submitConsultation,
  validateConsultation,
  type ConsultationRequest,
} from "../lib/consultation";

/**
 * One line of the closing headline, with its emphasised phrase.
 *
 * The mockup sets a phrase INSIDE the line in shimmering gold italic —
 * "Ready to bring your / *dream event* to life?" — so neither the whole-line
 * rule the hero uses nor SplitTitle's last-word rule reproduces it. Asterisks
 * mark the phrase, which keeps the choice in the copy where an owner can move
 * it, and keeps markup out of the content.
 */
function HeadlineLine({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*([^*]+)\*/g).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="gold-shimmer font-semibold italic">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * The closing invitation, and the enquiry that carries it.
 *
 * The mockup ends on a CTA banner whose two controls go nowhere: a
 * "Schedule Consultation" button with href="#" and a placeholder phone
 * number. Its composition is kept exactly — charcoal ground, photograph at
 * 10%, two blurred gold orbs, shimmering serif headline — and the form is
 * added beneath it in the same idiom, because an event enquiry needs a dozen
 * answers that a dead link cannot collect.
 *
 * AN ENQUIRY, NOT A BOOKING. Nothing here holds a date. The success copy says
 * so and hands back a reference, which is what a client quotes when the
 * conversation moves to Messenger.
 */
export function Inquiry({ business }: { business: BusinessProfile }) {
  const { ctaBanner, contact } = business;
  // Their own sections since migration 0044 — no longer a key inside the
  // events content, which is where "what the form asks" used to hide.
  const form = business.enquiry;

  /*
   * The booking half, and ABSENT IS MEANINGFUL: no heading means no mode
   * switch and a pure enquiry form, which is right for a studio that only
   * ever quotes after a conversation.
   */
  const consultation = business.booking?.title ? business.booking : null;
  /*
   * Which of the two the reader is filling in.
   *
   * A mode switch rather than a second section, which is what the retreat's
   * form does for the same reason: one call to action reads better than two
   * competing ones, and the approved design has room for a form here, not for
   * a form and a half. Absent consultation content leaves a pure enquiry form
   * and no switch at all.
   */
  const [mode, setMode] = useState<"enquiry" | "booking">("enquiry");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  /*
   * `sent` rather than "we have a reference": a successful post can return
   * none (see InquiryResult), and keying the confirmation off the reference
   * would drop the client back onto a blank form after an enquiry that
   * actually arrived.
   */
  const [sent, setSent] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // The mockup hard-codes a placeholder number. This takes the tenant's own,
  // classified by the shared helper so a real number dials and anything else
  // is skipped rather than rendered as a broken tel: link.
  const phone = contact.details
    .flatMap((detail) => detail.lines)
    .map((line) => ({ text: line, ...contactLine(line) }))
    .find((line) => line.kind === "phone");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (key: string) => (data.get(key)?.toString() ?? "").trim();

    if (mode === "booking") return handleBooking(value);

    const inquiry: EventInquiry = {
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      eventType: value("event_type"),
      eventDate: value("event_date"),
      venue: value("venue"),
      guests: value("guests"),
      budget: value("budget"),
      services: data.getAll("services").map((entry) => entry.toString()),
      theme: value("theme"),
      details: value("details"),
    };

    const problem = validateInquiry(inquiry);
    if (problem) {
      setMessage({ text: problem, ok: false });
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      const result = await submitInquiry(inquiry, business.slug);
      setReference(result.reference);
      setSent(true);
      // Focus follows the content: the form this replaces is gone, so without
      // moving focus a keyboard user is left on a detached element and never
      // hears the confirmation.
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      /*
       * The endpoint writes its refusals for the visitor — "Too many
       * messages. Please try again shortly." — so its wording is preferred
       * over ours. The generic line is for a dropped connection, where there
       * is no server message at all.
       */
      setMessage({
        text:
          error instanceof Error && error.message !== "Server error"
            ? error.message
            : "That did not send. Please try again in a moment, or message us directly.",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  }

  /**
   * The consultation path. A different endpoint, a different success state,
   * and no reference — /api/bookings mints none, because an appointment is
   * identified by its slot rather than by a code.
   */
  async function handleBooking(value: (key: string) => string) {
    const request: ConsultationRequest = {
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      topic: value("topic"),
      date: value("slot_date"),
      time: value("slot_time"),
      notes: value("details"),
    };

    const problem = validateConsultation(request);
    if (problem) {
      setMessage({ text: problem, ok: false });
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      await submitConsultation(request, business.slug);
      setReference(null);
      setSent(true);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      setMessage({
        text:
          error instanceof Error && error.message !== "Server error"
            ? error.message
            : "That did not send. Please try again in a moment, or message us directly.",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden py-28 lg:py-40">
      <div aria-hidden="true" className="absolute inset-0 bg-charcoal">
        {/* The same photograph as the approach panel, at a tenth — wash
            rather than picture, which is why it carries no alt text. */}
        {business.services.approach?.image && (
          <div className="absolute inset-0 opacity-10">
            <TenantImage
              src={business.services.approach.image}
              alt=""
              sizes="100vw"
            />
          </div>
        )}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal/95 to-charcoal/90"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/4 top-10 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-10 right-1/4 h-48 w-48 rounded-full bg-gold-400/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-6 lg:px-12">
        <div className={cn(reveal(), "text-center")}>
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
            {ctaBanner.label}
          </p>
          <h2 className="mb-8 font-serif text-4xl font-light leading-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            {ctaBanner.titleLines.map((line, i) => (
              <Fragment key={line}>
                {i > 0 && <br className="hidden sm:block" />}
                <HeadlineLine text={line} />{" "}
              </Fragment>
            ))}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-white/50">
            {ctaBanner.description}
          </p>

          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <BtnGold href={ctaBanner.primaryCta.href} className="px-12 py-5">
              {ctaBanner.primaryCta.label}
            </BtnGold>
            {phone?.href && (
              <a
                href={phone.href}
                className="group flex items-center gap-3 text-white/70 transition-colors hover:text-gold-400"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 transition-colors group-hover:border-gold-400">
                  <Phone aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{phone.text}</span>
              </a>
            )}
          </div>
        </div>

        {form && (
          <div
            id="inquiry"
            className={cn(
              reveal(),
              "glass scroll-mt-28 rounded-3xl p-6 sm:p-10",
            )}
            style={delay(150)}
          >
            {sent ? (
              <div
                ref={successRef}
                tabIndex={-1}
                className="py-6 text-center outline-none"
              >
                <span
                  aria-hidden="true"
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/15"
                >
                  <CheckCircle2 className="h-8 w-8 text-gold-400" />
                </span>
                <h3 className="mb-3 font-serif text-3xl font-light text-white">
                  {mode === "booking" && consultation
                    ? consultation.successTitle
                    : form.successTitle}
                </h3>
                <p className="mx-auto mb-8 max-w-md text-white/50">
                  {mode === "booking" && consultation
                    ? consultation.successText
                    : form.successText}
                </p>

                {/* Omitted rather than left blank when the server didn't
                    send one — a heading over an empty code reads as a page
                    that failed halfway. */}
                {reference && (
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                      Your reference
                    </p>
                    {/* select-all because this gets copied into a chat
                        window, and letter-spaced because it also gets read
                        down a phone. */}
                    <p className="mb-10 select-all font-mono text-2xl tracking-[0.15em] text-gold-300">
                      {reference}
                    </p>
                  </>
                )}

                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  {/*
                   * `?.label`, not just `?.`: clearing the label in the CMS
                   * leaves an object with empty strings, not nothing at all,
                   * and a truthiness check on the object would render an
                   * unlabelled button pointing nowhere. The empty label IS
                   * how an owner removes the button.
                   */}
                  {form.messengerCta?.label && form.messengerCta.href && (
                    <BtnGold
                      href={form.messengerCta.href}
                      className="px-10 py-4"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {form.messengerCta.label}
                    </BtnGold>
                  )}
                  <BtnOutline href="#top" className="px-10 py-4">
                    Back to top
                  </BtnOutline>
                </div>
              </div>
            ) : (
              <>
                {/*
                 * The mode switch, as radios in a fieldset.
                 *
                 * Radios rather than styled buttons: this is a choice between
                 * two options with one selected, which is what a radio group
                 * IS — so the arrow keys, the announced group name and the
                 * selected state all come from the browser. Same treatment the
                 * retreat's form uses.
                 */}
                {consultation && (
                  <fieldset className="mb-8">
                    <legend className="sr-only">What can we help with</legend>
                    <div className="flex flex-wrap justify-center gap-3">
                      {(
                        [
                          ["enquiry", consultation.enquiryLabel],
                          ["booking", consultation.bookingLabel],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={cn(
                            "cursor-pointer rounded-full border px-6 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300",
                            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-400",
                            mode === value
                              ? "border-gold-400 bg-gold-400 text-charcoal"
                              : "border-white/20 text-white/60 hover:border-gold-400/50 hover:text-white",
                          )}
                        >
                          <input
                            type="radio"
                            name="mode"
                            value={value}
                            checked={mode === value}
                            onChange={() => {
                              setMode(value);
                              setMessage(null);
                            }}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <div className="mb-8 text-center">
                  <h3 className="mb-3 font-serif text-3xl font-light text-white">
                    <SplitTitle
                      text={
                        mode === "booking" && consultation
                          ? consultation.title
                          : form.title
                      }
                      onDark
                    />
                  </h3>
                  <p className="mx-auto max-w-lg text-sm text-white/50">
                    {mode === "booking" && consultation
                      ? consultation.intro
                      : form.intro}
                  </p>
                </div>

                {/* noValidate: the browser's own bubbles are unstyled, land
                    awkwardly on the dark ground, and cannot express the one
                    rule that matters here — a phone OR an email.
                    validateInquiry owns the wording; `required` stays on the
                    inputs so the requirement is still announced. */}
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="grid gap-5 sm:grid-cols-2"
                >
                  <Field id="inq-name" label="Your name" required>
                    <input
                      id="inq-name"
                      name="name"
                      autoComplete="name"
                      required
                      className={fieldClass}
                    />
                  </Field>

                  <Field
                    id="inq-phone"
                    label="Contact number"
                    required={mode === "booking"}
                  >
                    {/* Required for a consultation and not for an enquiry: the
                        confirmation is a text, and the owner rings to agree
                        the time. */}
                    <input
                      id="inq-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required={mode === "booking"}
                      className={fieldClass}
                    />
                  </Field>

                  <Field id="inq-email" label="Email" className="sm:col-span-2">
                    <input
                      id="inq-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={fieldClass}
                    />
                  </Field>

                  {/*
                   * The enquiry-only fields, UNMOUNTED in booking mode
                   * rather than hidden — so nothing stale is submitted and a
                   * keyboard user does not tab through a venue and a guest
                   * count that do not apply to a consultation.
                   */}
                  {mode === "enquiry" && (
                    <>
                  <Field id="inq-type" label="Kind of event" required>
                    <select
                      id="inq-type"
                      name="event_type"
                      required
                      defaultValue=""
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Please choose
                      </option>
                      {form.eventTypes.map((option) => (
                        <option
                          key={option.label}
                          value={option.value ?? option.label}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    id="inq-date"
                    label="Event date"
                    hint="An estimate is fine if the date is not fixed."
                  >
                    <input
                      id="inq-date"
                      name="event_date"
                      type="date"
                      aria-describedby="inq-date-hint"
                      className={fieldClass}
                    />
                  </Field>

                  <Field id="inq-venue" label="Venue or location">
                    <input id="inq-venue" name="venue" className={fieldClass} />
                  </Field>

                  <Field id="inq-guests" label="Approximate guests">
                    <input
                      id="inq-guests"
                      name="guests"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={5000}
                      className={fieldClass}
                    />
                  </Field>

                  {form.budgetRanges.length > 0 && (
                    <Field
                      id="inq-budget"
                      label="Budget range"
                      className="sm:col-span-2"
                    >
                      <select
                        id="inq-budget"
                        name="budget"
                        defaultValue=""
                        className={selectClass}
                      >
                        <option value="">Prefer not to say</option>
                        {form.budgetRanges.map((option) => (
                          <option
                            key={option.label}
                            value={option.value ?? option.label}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {form.serviceNeeds.length > 0 && (
                    <fieldset className="sm:col-span-2">
                      <legend className="mb-3 block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/60">
                        Services needed
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {form.serviceNeeds.map((option, i) => (
                          <CheckField
                            key={option.label}
                            id={`inq-service-${i}`}
                            name="services"
                            value={option.value ?? option.label}
                            label={option.label}
                          />
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <Field
                    id="inq-theme"
                    label="Theme or style"
                    className="sm:col-span-2"
                    hint="Colours, mood, anything you have been saving."
                  >
                    <input
                      id="inq-theme"
                      name="theme"
                      aria-describedby="inq-theme-hint"
                      className={fieldClass}
                    />
                  </Field>
                    </>
                  )}

                  {mode === "booking" && consultation && (
                    <>
                      {consultation.topics.length > 0 && (
                        <Field id="inq-topic" label="What it is about">
                          <select
                            id="inq-topic"
                            name="topic"
                            defaultValue=""
                            className={selectClass}
                          >
                            <option value="">A first conversation</option>
                            {consultation.topics.map((option) => (
                              <option
                                key={option.label}
                                value={option.value ?? option.label}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}

                      <Field
                        id="inq-slot-date"
                        label="Day"
                        required
                        hint="We will confirm before it is booked in."
                      >
                        <input
                          id="inq-slot-date"
                          name="slot_date"
                          type="date"
                          required
                          aria-describedby="inq-slot-date-hint"
                          className={fieldClass}
                        />
                      </Field>

                      <Field id="inq-slot-time" label="Time" required>
                        <input
                          id="inq-slot-time"
                          name="slot_time"
                          type="time"
                          required
                          className={fieldClass}
                        />
                      </Field>
                    </>
                  )}

                  <Field
                    id="inq-details"
                    label="Anything else"
                    className="sm:col-span-2"
                  >
                    <textarea
                      id="inq-details"
                      name="details"
                      rows={4}
                      className={textareaClass}
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <BtnGoldSubmit
                      disabled={sending}
                      aria-busy={sending}
                      className="w-full px-10 py-4 sm:w-auto"
                    >
                      {sending
                        ? "Sending"
                        : mode === "booking"
                          ? "Request consultation"
                          : "Send enquiry"}
                    </BtnGoldSubmit>
                    <FormMessage message={message} />
                    <p className="mt-4 text-xs text-white/55">
                      {mode === "booking"
                        ? "We will confirm your slot before it is booked in."
                        : "This is an enquiry, not a confirmed booking. We will come back to you to talk it through."}
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
