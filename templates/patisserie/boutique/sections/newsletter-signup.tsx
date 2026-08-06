"use client";

import { useState } from "react";
import type { BusinessProfile, FooterNewsletter } from "@/types/business";
import { BtnAction } from "../components/buttons";

/**
 * The footer sign-up box.
 *
 * Rendered only when the tenant's sending domain is verified — that gate is in
 * `buildFooter`, not here, so a site that cannot send never ships this markup
 * at all. Collecting addresses nobody can mail would be worse than having no
 * box: the visitor believes they subscribed and nothing ever arrives.
 *
 * The reply is deliberately the same for every outcome, because the API answers
 * the same way for every outcome. A footer box must not become a way to ask
 * whether a particular person is on this bakery's list.
 */
export function NewsletterSignup({
  business,
  newsletter,
}: {
  business: BusinessProfile;
  newsletter: FooterNewsletter;
}) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = (data.get("email")?.toString() ?? "").trim();

    if (!email) {
      setMessage({ text: "Enter your email address.", ok: false });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${window.location.origin}/api/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          // Stored verbatim with the subscriber, so their record says what this
          // page actually told them.
          consentText: newsletter.consent,
          source: "footer",
          company: data.get("company")?.toString() ?? "",
          // Consulted only where the host doesn't identify a tenant.
          slug: business.slug,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          text: body.error ?? "That didn't send. Please try again.",
          ok: false,
        });
        return;
      }
      setMessage({
        text: body.message ?? "Thanks — check your email to confirm.",
        ok: true,
      });
      form.reset();
    } catch {
      setMessage({
        text: "That didn't send. Please try again in a moment.",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h2 className="mb-[1.15rem] text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[rgba(255,253,248,0.5)]">
        {newsletter.title}
      </h2>
      <p className="mb-4 text-[0.875rem]">{newsletter.text}</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <div className="flex gap-2 max-[520px]:flex-col">
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={newsletter.placeholder}
            className="min-w-0 flex-1 rounded-full border border-[rgba(255,253,248,0.16)] bg-[rgba(255,253,248,0.07)] px-4 py-[0.78rem] text-[0.85rem] text-paper outline-none transition-colors placeholder:text-[rgba(255,253,248,0.4)] focus:border-mint focus:bg-[rgba(255,253,248,0.11)]"
          />
          {/* Honeypot: hidden from people, skipped in the tab order, and
              announced to nobody. Bots fill it; the API discards those. */}
          <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="newsletter-company">Company</label>
            <input
              id="newsletter-company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <BtnAction
            type="submit"
            variant="light"
            size="sm"
            disabled={sending}
            aria-busy={sending}
            className="max-[520px]:w-full"
          >
            {sending ? "Sending…" : newsletter.buttonLabel}
          </BtnAction>
        </div>

        <p className="text-[0.72rem] leading-[1.5] text-[rgba(255,253,248,0.45)]">
          {newsletter.consent}
        </p>

        <p
          role="status"
          aria-live="polite"
          className={
            message
              ? `mt-1 rounded-[10px] px-3 py-2 text-[0.78rem] ${
                  message.ok
                    ? "bg-[rgba(130,213,197,0.16)] text-mint"
                    : "bg-[rgba(244,138,184,0.16)] text-pink"
                }`
              : "hidden"
          }
        >
          {message?.text}
        </p>
      </form>
    </div>
  );
}
