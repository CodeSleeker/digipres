"use client";

import { useEffect, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { Field, Select, TextArea, TextInput } from "../components/fields";
import { Arrow } from "../components/buttons";

/**
 * The enquiry, in two modes.
 *
 * "Stay" posts to /api/bookings — the platform's public, tenant-scoped intake,
 * the same endpoint the barber and patisserie forms use. The enquiry becomes a
 * customer record and a scheduled appointment, the owner gets an SMS and an
 * email, and the dashboard updates live.
 *
 * "Question" posts to /api/enquiries instead, and that separation is the whole
 * point of the mode switch. Someone asking whether there is wifi has no
 * arrival date, and forcing them to invent one would file a question in the
 * owner's calendar, count it towards the pending-bookings badge, and drop it
 * into the path the review automation reads — texting a review request for a
 * stay that never happened. See migration 0036.
 *
 * ARRIVAL TIME, in stay mode. The bookings endpoint stores an instant, so it
 * wants a time; a stay has a date and no minute. Rather than ask a guest to
 * invent one, the arrival is recorded at the conventional 2pm check-in and the
 * departure travels in the note.
 */
type Mode = "stay" | "question";

export function EnquiryForm({ business }: { business: BusinessProfile }) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<Mode>("stay");
  const options = business.contact.serviceOptions;

  /**
   * Clear the confirmation after a few seconds — but ONLY the confirmation. A
   * failure has to stay on screen: it is the only thing telling the guest their
   * enquiry did not send, and taking it away would leave them believing it did.
   */
  useEffect(() => {
    if (!message?.ok) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  // Client-side checks are a courtesy. /api/bookings re-parses everything it
  // receives — this cannot be the boundary, and isn't treated as one.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => (data.get(key)?.toString() ?? "").trim();

    const name = value("name");
    const phone = value("phone");
    const email = value("email");
    const stayType = value("stay_type") || "Stay enquiry";
    const arrival = value("arrival");
    const departure = value("departure");
    const guests = value("guests");
    const notes = value("message");

    // A question needs someone to answer it TO; a stay needs a day as well.
    if (!name || (!phone && !email)) {
      setMessage({
        text: "Please add your name and either a mobile number or an email address.",
        ok: false,
      });
      return;
    }
    if (mode === "question" && !notes) {
      setMessage({ text: "Please write your question.", ok: false });
      return;
    }
    if (mode === "stay") {
      if (!phone || !arrival) {
        setMessage({
          text: "Please add a contact number and the day you would like to arrive.",
          ok: false,
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const arriveOn = new Date(arrival);
      if (Number.isNaN(arriveOn.getTime()) || arriveOn < today) {
        setMessage({ text: "Please choose today or a future date.", ok: false });
        return;
      }
      if (departure && departure < arrival) {
        setMessage({
          text: "The departure date needs to be on or after the arrival date.",
          ok: false,
        });
        return;
      }
    }

    const endpoint = mode === "stay" ? "/api/bookings" : "/api/enquiries";
    const body =
      mode === "stay"
        ? {
            name,
            phone,
            service: stayType,
            date: arrival,
            // See the note above: the conventional check-in hour, not a time
            // the guest was asked to guess.
            time: "14:00",
            /*
             * The bookings endpoint has no column for a departure, a party size
             * or an email, so they travel in the note — which is rendered in
             * the dashboard and included in the owner's email. Dropping them to
             * fit the schema would lose the three things a stay enquiry is
             * actually about.
             */
            notes: [
              departure && `Departure: ${departure}`,
              guests && `Guests: ${guests}`,
              email && `Email: ${email}`,
              notes,
            ]
              .filter(Boolean)
              .join("\n"),
            slug: business.slug,
          }
        : {
            name,
            email,
            phone,
            // The dropdown labels what a stay would be; in question mode it
            // labels what the question is about, which is the same list read
            // the other way round.
            topic: value("stay_type") || undefined,
            message: notes,
            slug: business.slug,
          };

    setSending(true);
    try {
      const res = await fetch(`${window.location.origin}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `slug` is consulted only when the request host doesn't identify a
        // tenant — local dev and the apex, where sites are served from
        // /s/<slug>. On a real tenant domain the host wins.
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Server error");
      }
      setMessage({
        text:
          mode === "stay"
            ? "Thank you. Your enquiry is with us and we will come back to you shortly."
            : "Thank you. Your question is with us and we will answer it shortly.",
        ok: true,
      });
      form.reset();
    } catch {
      setMessage({
        text: "That did not send. Please try again in a moment, or message us on Facebook.",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="reveal mx-auto mt-[2.8rem] grid w-full max-w-[46rem] gap-4 text-left sm:grid-cols-2"
    >
      {/*
       * The mode switch, as radios in a fieldset.
       *
       * Radios rather than a styled pair of buttons: this is a choice between
       * two options with one selected, which is what a radio group IS — so the
       * arrow keys, the announced group name and the selected state all come
       * from the browser. The visual treatment is a label the input hides
       * behind, so nothing is lost by it.
       */}
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-[0.62rem] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.72)]">
          What can we help with
        </legend>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["stay", "I'd like to stay"],
              ["question", "I have a question"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={[
                "cursor-pointer rounded-[2px] border px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] transition-colors duration-300",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay",
                mode === value
                  ? "border-ivory bg-ivory text-bark"
                  : "border-[rgba(245,241,232,0.34)] text-ivory hover:border-ivory",
              ].join(" ")}
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

      <Field label="Your name" htmlFor="enq-name">
        <TextInput id="enq-name" name="name" autoComplete="name" required />
      </Field>
      <Field
        label={mode === "stay" ? "Mobile" : "Mobile (optional)"}
        htmlFor="enq-phone"
      >
        <TextInput
          id="enq-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required={mode === "stay"}
        />
      </Field>

      <Field
        label={mode === "stay" ? "Email (optional)" : "Email"}
        htmlFor="enq-email"
        className="sm:col-span-2"
      >
        <TextInput id="enq-email" name="email" type="email" autoComplete="email" />
      </Field>

      {/* Dates and party size belong to a stay. In question mode they are
          unmounted rather than hidden, so nothing stale is submitted and a
          keyboard user doesn't tab through fields that don't apply. */}
      {mode === "stay" && (
        <>
          <Field label="Arrival" htmlFor="enq-arrival">
            <TextInput id="enq-arrival" name="arrival" type="date" required />
          </Field>
          <Field label="Departure" htmlFor="enq-departure">
            <TextInput id="enq-departure" name="departure" type="date" />
          </Field>

          <Field label="Guests" htmlFor="enq-guests">
            <TextInput
              id="enq-guests"
              name="guests"
              type="number"
              min={1}
              max={40}
            />
          </Field>
        </>
      )}

      {/* Rendered only when the owner has defined the choices. An empty select
          is worse than none — it asks a question with no answers. */}
      {options.length > 0 && (
        <Field
          label={mode === "stay" ? "What kind of stay" : "What is it about"}
          htmlFor="enq-type"
        >
          <Select id="enq-type" name="stay_type" defaultValue={options[0]!.label}>
            {options.map((option) => (
              <option key={option.label} value={option.value ?? option.label}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field
        label={mode === "stay" ? "Anything we should know" : "Your question"}
        htmlFor="enq-message"
        className="sm:col-span-2"
      >
        <TextArea id="enq-message" name="message" required={mode === "question"} />
      </Field>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={sending}
          className="group/btn inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-[2px] border border-ivory bg-ivory px-[1.7rem] py-[0.95rem] text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-bark transition-[background-color,color] duration-500 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-transparent hover:text-ivory disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {sending
            ? "Sending…"
            : mode === "stay"
              ? "Send enquiry"
              : "Send question"}
          {!sending && <Arrow />}
        </button>

        {/*
         * `aria-live` so the outcome is announced rather than only shown — the
         * message appears far from the button a screen-reader user just
         * activated, and without this nothing tells them anything happened.
         */}
        <p
          aria-live="polite"
          className={
            message
              ? `mt-4 text-[0.85rem] font-light ${message.ok ? "text-ivory" : "text-[#e5a3a3]"}`
              : "sr-only"
          }
        >
          {message?.text ?? ""}
        </p>
      </div>
    </form>
  );
}
