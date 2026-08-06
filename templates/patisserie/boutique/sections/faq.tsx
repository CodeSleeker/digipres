"use client";

import { useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { Btn } from "../components/buttons";
import { SectionHead } from "../components/section-head";
import { Plus, QuestionMark } from "../components/icons";
import { stagger } from "../lib/reveal";

/**
 * The questions, and the panel that offers a person instead.
 *
 * EVERY ANSWER STAYS IN THE DOM, collapsed or not. That is the whole point of
 * the section: a crawler or an answer engine has to be able to read text the
 * visitor hasn't clicked yet, and the same strings are emitted as FAQPage
 * structured data (lib/seo/json-ld.ts) — which Google's policy requires to
 * match what the page shows. An accordion that mounted panels on open would
 * hide precisely the content this section exists to publish, so the collapse is
 * done with `grid-template-rows`, which animates height without removing
 * anything.
 *
 * Renders NOTHING when the tenant has written no questions, so an
 * un-customized site shows no empty strip.
 */
export function Faq({ business }: { business: BusinessProfile }) {
  const { faq, patisserie } = business;
  // One open at a time, matching the source. `null` is "all closed", which is
  // the state the page loads in.
  const [open, setOpen] = useState<number | null>(null);

  if (!faq.items.length) return null;
  const aside = patisserie?.faqAside;

  return (
    <section id="faq" className="relative pb-[var(--pastry-section)]">
      <div className="pastry-shell grid grid-cols-[0.8fr_1.2fr] items-start gap-[clamp(2.5rem,1rem+4vw,4.5rem)] max-[900px]:grid-cols-1">
        {aside && (
          <aside className="reveal reveal-from-left sticky top-[calc(var(--pastry-nav-h)+24px)] rounded-[30px] border border-[var(--pastry-line-soft)] bg-snow px-[1.85rem] py-8 shadow-[var(--pastry-sh-sm)] max-[900px]:static max-[900px]:order-2">
            <span
              aria-hidden="true"
              className="grid h-[46px] w-[46px] place-content-center rounded-full bg-mint-wash text-mint-deep"
            >
              <QuestionMark />
            </span>
            <h2 className="mt-4 font-display text-[clamp(1.3rem,1.15rem+0.6vw,1.6rem)] font-medium leading-[1.1] tracking-[-0.012em] text-ink">
              {aside.title}
            </h2>
            <p className="mt-[0.8rem] text-[0.9rem]">{aside.text}</p>
            <Btn
              href={aside.cta.href}
              arrow={aside.cta.arrow}
              className="mt-6 w-full"
            >
              {aside.cta.label}
            </Btn>
          </aside>
        )}

        <div>
          <SectionHead heading={faq.heading} className="mb-8" />

          <div
            className="reveal border-t border-[var(--pastry-line)]"
            style={stagger(1)}
          >
            {faq.items.map((item, i) => {
              const expanded = open === i;
              return (
                <div
                  key={item.question}
                  className="border-b border-[var(--pastry-line)]"
                >
                  <h3>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`faq-answer-${i}`}
                      id={`faq-question-${i}`}
                      onClick={() => setOpen(expanded ? null : i)}
                      className="flex w-full cursor-pointer items-center justify-between gap-6 border-0 bg-transparent py-6 text-left font-display text-[clamp(1.05rem,1rem+0.3vw,1.22rem)] font-medium leading-[1.35] text-ink transition-colors duration-300 hover:text-warm-deep"
                    >
                      {item.question}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid h-8 w-8 flex-none place-content-center rounded-full border border-[var(--pastry-line)] transition-[background-color,border-color,transform,color] duration-500",
                          expanded &&
                            "rotate-[135deg] border-ink bg-ink text-paper",
                        )}
                      >
                        <Plus size={13} />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                    className={cn(
                      "grid transition-[grid-template-rows] duration-[550ms] ease-[cubic-bezier(.16,1,.3,1)]",
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      {/* whitespace-pre-line so an owner's paragraph breaks
                          survive the round trip through storage. */}
                      <p className="max-w-[52ch] whitespace-pre-line pb-[1.55rem] text-[0.925rem]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
