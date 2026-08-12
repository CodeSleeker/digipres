"use client";

import { Fragment, useEffect, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { contactLine } from "@/lib/website/contact-line";
import { BtnAction } from "../components/buttons";
import { Field, FormMessage, fieldClass, selectClass } from "../components/fields";
import { Eyebrow, SectionTitle } from "../components/section-head";
import { DetailIcon, SocialIcon } from "../components/icons";
import { stagger } from "../lib/reveal";

/**
 * The enquiry form, and where to find the studio.
 *
 * Posts to /api/bookings — the platform's public, tenant-scoped intake, the
 * same endpoint the barber template's booking form uses. The owner sees the
 * enquiry in their dashboard; nothing here is a stub.
 *
 * That endpoint requires a DATE AND A TIME, because a request without one
 * cannot be placed in a diary. The mockup asked only for "needed by", so a time
 * field sits beside it — the one addition to the approved layout, and a
 * functional necessity rather than a redesign: without it the form would either
 * fail validation or invent a pickup time the customer never chose.
 */
export function Contact({ business }: { business: BusinessProfile }) {
  const { contact, footer } = business;
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [sending, setSending] = useState(false);

  /**
   * Clear the confirmation after a few seconds — but ONLY the confirmation. A
   * failure has to stay on screen: it is the only thing telling the customer
   * their enquiry did not send, and taking it away would leave them believing
   * it did.
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
    const orderType = value("order_type");
    const date = value("needed_by");
    const time = value("needed_at");
    const notes = value("message");

    if (!name || !phone || !orderType || !date || !time) {
      setMessage({
        text: "Please complete your name, mobile, what it is for, and the date and time you need it.",
        ok: false,
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(date);
    if (Number.isNaN(chosen.getTime()) || chosen < today) {
      setMessage({ text: "Please choose today or a future date.", ok: false });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${window.location.origin}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          service: orderType,
          date,
          time,
          // The endpoint has no email column of its own; keeping it in the note
          // means a reply address still reaches the owner rather than being
          // dropped on the floor.
          notes: [email && `Email: ${email}`, notes].filter(Boolean).join("\n"),
          // Consulted only when the request host doesn't identify a tenant —
          // local dev and the apex, where sites are served from /s/<slug>.
          slug: business.slug,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Server error");
      }
      setMessage({
        text: "Thank you. Your enquiry is with us and we will reply within one business day.",
        ok: true,
      });
      form.reset();
    } catch {
      setMessage({
        text: "That did not send. Please try again in a moment, or call us.",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="relative bg-beige py-[var(--pastry-section)]">
      <div className="pastry-shell">
        <div className="reveal max-w-[600px]">
          <Eyebrow className="mb-[1.1rem]">{contact.label}</Eyebrow>
          <SectionTitle>
            {contact.titleLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {i === contact.titleLines.length - 1 &&
                contact.titleLines.length > 1 ? (
                  <span className="font-normal italic">{line}</span>
                ) : (
                  line
                )}
              </Fragment>
            ))}
          </SectionTitle>
          <p className="mt-[1.15rem] text-[clamp(1.02rem,0.97rem+0.3vw,1.185rem)] leading-[1.68] text-ink-70 [text-wrap:pretty]">
            {contact.intro}
          </p>
        </div>

        <div
          className="reveal reveal-scale mt-[clamp(2.5rem,2rem+2vw,3.5rem)] grid grid-cols-[1.08fr_0.92fr] overflow-hidden rounded-[42px] border border-[var(--pastry-line-soft)] bg-snow shadow-[var(--pastry-sh-md)] max-[900px]:grid-cols-1"
          style={stagger(1)}
        >
          <form
            id="enquiry-form"
            onSubmit={handleSubmit}
            noValidate
            className="p-[clamp(2rem,1.2rem+2.6vw,3.25rem)]"
          >
            <div className="grid grid-cols-2 gap-[1.05rem] max-[560px]:grid-cols-1">
              <Field id="c-name" label="Full name">
                <input
                  id="c-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Maria Santos"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field id="c-phone" label="Mobile">
                <input
                  id="c-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="0917 000 0000"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field id="c-email" label="Email" className="col-span-2 max-[560px]:col-span-1">
                <input
                  id="c-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={fieldClass}
                />
              </Field>
              <Field id="c-type" label="What is it for?">
                <select
                  id="c-type"
                  name="order_type"
                  defaultValue=""
                  required
                  className={selectClass}
                >
                  <option value="">Choose one</option>
                  {contact.serviceOptions.map((option) => (
                    <option key={option.label} value={option.value ?? option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="c-date" label="Needed by">
                <input
                  id="c-date"
                  name="needed_by"
                  type="date"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field id="c-time" label="Pickup or delivery time">
                <input
                  id="c-time"
                  name="needed_at"
                  type="time"
                  required
                  className={fieldClass}
                />
              </Field>
              <Field
                id="c-msg"
                label="Tell us more"
                className="col-span-2 max-[560px]:col-span-1"
              >
                <textarea
                  id="c-msg"
                  name="message"
                  placeholder="Flavours you love, colours, guest count, anything at all."
                  className={cn(fieldClass, "min-h-[118px] resize-y leading-[1.6]")}
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-[1.15rem]">
              <BtnAction
                type="submit"
                arrow={!sending}
                disabled={sending}
                aria-busy={sending}
              >
                {sending ? "Sending…" : "Send enquiry"}
              </BtnAction>
              <p className="max-w-[24ch] text-[0.875rem] text-ink-45">
                No deposit is needed to ask.
              </p>
            </div>
            <FormMessage message={message} />
          </form>

          <div className="relative overflow-hidden bg-ink p-[clamp(2rem,1.2rem+2.6vw,3.25rem)] text-[rgba(255,253,248,0.78)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-[110px] -top-[110px] h-[340px] w-[340px] rounded-full bg-warm opacity-[0.22] blur-[90px]"
            />
            <h3 className="relative font-display text-[clamp(1.3rem,1.15rem+0.6vw,1.6rem)] font-medium text-paper">
              Visit the studio
            </h3>

            {contact.details.map((detail) => (
              <div
                key={detail.title}
                className="relative flex gap-4 border-b border-[rgba(255,253,248,0.12)] py-[1.35rem] last-of-type:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 flex-none place-content-center rounded-full bg-[rgba(255,253,248,0.09)] text-mint"
                >
                  <DetailIcon icon={detail.icon} />
                </span>
                <div>
                  <b className="mb-[0.2rem] block text-[0.875rem] font-semibold text-paper">
                    {detail.title}
                  </b>
                  <p className="text-[0.85rem] leading-[1.6] text-[rgba(255,253,248,0.7)]">
                    {detail.lines.map((line, i) => (
                      <Fragment key={i}>
                        {i > 0 && <br />}
                        <ContactLine line={line} />
                      </Fragment>
                    ))}
                  </p>
                </div>
              </div>
            ))}

            {footer.socials.length > 0 && (
              <div className="relative mt-7 flex gap-[0.6rem]">
                {footer.socials.map((social) => (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.ariaLabel}
                    className="grid h-10 w-10 place-content-center rounded-full border border-[rgba(255,253,248,0.18)] text-[rgba(255,253,248,0.8)] transition-[background-color,color,transform,border-color] duration-300 hover:-translate-y-[3px] hover:border-paper hover:bg-paper hover:text-ink"
                  >
                    <SocialIcon label={social.label} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A detail line, made actionable when it is a number or an address.
 *
 * The rules that decide WHICH it is now live in lib/website/contact-line.ts and
 * are shared with the retreat template — they are a fact about the string, and
 * a regex that gets a phone number wrong should be wrong in one place. The
 * markup below is unchanged and stays this template's own.
 */
function ContactLine({ line }: { line: string }) {
  const { href } = contactLine(line);

  if (!href) return <>{line}</>;
  return (
    <a href={href} className="hover:text-paper">
      {line}
    </a>
  );
}
