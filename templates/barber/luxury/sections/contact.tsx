"use client";

import { Fragment, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ButtonAction } from "../components/buttons";
import { SectionLabel } from "../components/section-heading";

/** Shared field styling ported from the mockup `.form-group input/select/textarea`. */
const fieldClass =
  "h-auto w-full rounded-none border border-dark-border bg-charcoal px-4 py-[0.9rem] font-body text-[0.9rem] text-white shadow-none outline-none transition-colors focus:border-gold focus-visible:border-gold focus-visible:ring-0 max-[768px]:min-h-12 max-[768px]:p-4 max-[768px]:text-base";

const labelClass =
  "mb-2 block text-[0.7rem] font-normal uppercase tracking-[2px] text-gray";

export function Contact({ business }: { business: BusinessProfile }) {
  const { contact } = business;
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // Client-side validation is a courtesy, not a control — /api/bookings parses
  // and re-validates everything it receives.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const value = (k: string) => (fd.get(k)?.toString() ?? "").trim();

    const name = value("name");
    const phone = value("phone");
    const service = value("service");
    const date = value("date");
    const time = value("time");
    const barber = value("barber");
    const notes = value("notes");

    if (!name || !phone || !service || !date || !time) {
      setFeedback({
        text: "Please complete your name, phone, service, date and time.",
        ok: false,
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    if (isNaN(selected.getTime()) || selected < today) {
      setFeedback({ text: "Please choose today or a future date.", ok: false });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `slug` is only consulted when the request host doesn't identify a
        // tenant — local dev and the apex, where sites are served from
        // /s/<slug>. On a real tenant domain the host wins and this is ignored.
        body: JSON.stringify({
          name,
          phone,
          service,
          date,
          time,
          barber,
          notes,
          slug: business.slug,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Server error");
      }
      setFeedback({
        text: "Booking confirmed. We will contact you shortly.",
        ok: true,
      });
      form.reset();
    } catch {
      setFeedback({
        text: "Failed to submit booking. Please try again later or call us.",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="bg-charcoal py-[var(--section-pad)]">
      <div className="site-container">
        <div className="grid grid-cols-2 gap-16 max-[1024px]:gap-10 max-[768px]:grid-cols-1 max-[768px]:gap-10">
          {/* Info */}
          <div>
            <SectionLabel className="reveal">{contact.label}</SectionLabel>
            <h2 className="reveal reveal-delay-1 mb-6 font-heading text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] tracking-[3px]">
              {contact.titleLines.map((line, i) => (
                <Fragment key={i}>
                  {line}
                  {i < contact.titleLines.length - 1 && <br />}
                </Fragment>
              ))}
            </h2>
            <p className="reveal reveal-delay-2 mb-10 text-base font-light leading-[1.8] text-gray-light">
              {contact.intro}
            </p>
            <div className="reveal reveal-delay-3 flex flex-col gap-6">
              {contact.details.map((detail) => (
                <div key={detail.title} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-gold/[0.08] text-[1.1rem] text-gold">
                    {detail.icon}
                  </div>
                  <div>
                    <h4 className="mb-1 font-heading text-[0.9rem] tracking-[2px]">
                      {detail.title}
                    </h4>
                    <p className="text-[0.9rem] leading-[1.6] text-gray-light">
                      {detail.lines.map((line, i) => (
                        <Fragment key={i}>
                          {line}
                          {i < detail.lines.length - 1 && <br />}
                        </Fragment>
                      ))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="reveal reveal-delay-2 border border-dark-border bg-dark p-10 max-[768px]:px-5 max-[768px]:py-8">
            <h3 className="mb-8 font-heading text-[1.5rem] tracking-[2px]">
              BOOK AN APPOINTMENT
            </h3>
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
                <div className="mb-5">
                  <Label htmlFor="name" className={labelClass}>
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Juan Dela Cruz"
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="mb-5">
                  <Label htmlFor="phone" className={labelClass}>
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="0917-xxx-xxxx"
                    required
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="mb-5">
                <Label htmlFor="service" className={labelClass}>
                  Service
                </Label>
                <select
                  id="service"
                  name="service"
                  required
                  defaultValue=""
                  className={fieldClass}
                >
                  <option value="">Select a service</option>
                  {contact.serviceOptions.map((opt) => (
                    <option key={opt.label} value={opt.value ?? opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
                <div className="mb-5">
                  <Label htmlFor="date" className={labelClass}>
                    Preferred Date
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="mb-5">
                  <Label htmlFor="time" className={labelClass}>
                    Preferred Time
                  </Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    required
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="mb-5">
                <Label htmlFor="barber" className={labelClass}>
                  Preferred Barber
                </Label>
                <select
                  id="barber"
                  name="barber"
                  defaultValue=""
                  className={fieldClass}
                >
                  <option value="">Any available</option>
                  {contact.barberOptions.map((opt) => (
                    <option key={opt.label} value={opt.value ?? opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-5">
                <Label htmlFor="notes" className={labelClass}>
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any special requests or style references..."
                  className={cn(fieldClass, "min-h-[100px] resize-y")}
                />
              </div>

              <ButtonAction
                type="submit"
                arrow
                disabled={loading}
                aria-busy={loading}
                className="mt-2 w-full justify-center max-[768px]:min-h-[52px]"
              >
                CONFIRM BOOKING
              </ButtonAction>

              <div
                aria-live="polite"
                className="mt-3 text-[0.85rem]"
                style={{ color: feedback ? (feedback.ok ? "#0a7a1f" : "#b02020") : undefined }}
              >
                {feedback?.text}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
