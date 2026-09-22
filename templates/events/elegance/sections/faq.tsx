"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHead } from "../components/section-head";
import { delay, reveal } from "../lib/reveal";

/**
 * The questions people ask before they get in touch.
 *
 * EVERY ANSWER STAYS IN THE DOM, open or not. That is the whole point of the
 * section rather than a detail of it: the same strings are emitted as FAQPage
 * structured data (lib/seo/json-ld.ts), and Google's policy requires that
 * markup to correspond to content VISIBLE on the page. An accordion that
 * mounted panels on open would hide precisely what this exists to publish.
 *
 * So the collapse is `grid-template-rows` going to zero, which animates the
 * height without removing anything — the same mechanism the patisserie's FAQ
 * uses, for the same reason.
 *
 * Renders NOTHING without questions. A heading over an empty strip reads as a
 * site that lost its content, and a studio that has not written any yet is
 * better served by the section not being there.
 */
export function Faq({ business }: { business: BusinessProfile }) {
  const { faq } = business;
  // One open at a time; `null` is all closed, which is how the page loads.
  const [open, setOpen] = useState<number | null>(null);

  if (!faq.items.length) return null;

  return (
    <section id="faq" className="relative bg-cream py-24 lg:py-32">
      <div
        aria-hidden="true"
        className="absolute right-0 top-1/3 h-[380px] w-[380px] rounded-full bg-gold-100/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl px-6 lg:px-12">
        <SectionHead heading={faq.heading} className="mb-14" />

        <dl className="grid gap-4">
          {faq.items.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const labelId = `faq-label-${i}`;

            return (
              <div
                key={item.question}
                className={cn(
                  reveal(),
                  "event-card overflow-hidden rounded-2xl border border-gold-100/70 bg-white",
                )}
                style={delay(60 * (i + 1))}
              >
                <dt>
                  <button
                    type="button"
                    id={labelId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left lg:px-8"
                  >
                    <span className="font-serif text-lg font-medium text-charcoal lg:text-xl">
                      {item.question}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-8 w-8 flex-none items-center justify-center rounded-full border border-gold-200 text-gold-600 transition-transform duration-300",
                        isOpen && "rotate-45 border-gold-400 bg-gold-400/15",
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                </dt>

                {/*
                 * `grid-template-rows` 0fr → 1fr. The answer is present and
                 * readable to a crawler in both states; only its height
                 * changes. `aria-hidden` is deliberately NOT set — the text is
                 * part of the page whether or not it has been clicked.
                 */}
                <dd
                  id={panelId}
                  aria-labelledby={labelId}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-sm leading-relaxed text-charcoal/60 lg:px-8 lg:pb-7">
                      {item.answer}
                    </p>
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
