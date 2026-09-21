import { Fragment } from "react";
import type { SectionHeading } from "@/types/business";
import { cn } from "@/lib/utils";
import { delay, reveal } from "../lib/reveal";

/**
 * Title text split so the closing clause is set in gold italic — the mockup's
 * `<span class="italic font-semibold text-gold-600">` treatment, driven by
 * content rather than markup, as the patisserie template does it.
 *
 * An explicit newline wins: that is the owner saying where the emphasis
 * begins, and it is the only way to mark a clause of more than one word ("Our
 * \n Happy Clients"). Without one the final word is emphasised, which is the
 * shape most of these titles take ("Latest Events", "Our Services").
 *
 * A single-word title renders plain. Emphasising the whole of "Portfolio"
 * would be emphasis that distinguishes nothing.
 */
export function SplitTitle({
  text,
  onDark = false,
}: {
  text: string;
  onDark?: boolean;
}) {
  const [lead, accent] = splitTitle(text);

  return (
    <>
      {lead}
      {accent && (
        <Fragment>
          {lead && " "}
          <span
            className={cn(
              "font-semibold italic",
              onDark ? "text-gold-400" : "text-gold-600",
            )}
          >
            {accent}
          </span>
        </Fragment>
      )}
    </>
  );
}

/** → [roman part, emphasised part]. The second may be empty. */
function splitTitle(text: string): [string, string] {
  const explicit = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (explicit.length > 1) {
    return [explicit.slice(0, -1).join(" "), explicit[explicit.length - 1]!];
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text.trim(), ""];
  return [words.slice(0, -1).join(" "), words[words.length - 1]!];
}

/**
 * The section header the mockup repeats verbatim in every section: a gold
 * eyebrow in wide caps, a light serif title whose closing clause is gold
 * italic, a hairline divider, and an optional lead paragraph.
 *
 * Extracted rather than copied because it appeared identically six times, and
 * six copies of the same five elements is six places for them to drift apart.
 */
export function SectionHead({
  heading,
  align = "center",
  onDark = false,
  className,
}: {
  heading: SectionHeading;
  align?: "center" | "left";
  onDark?: boolean;
  className?: string;
}) {
  const centred = align === "center";

  return (
    <div className={cn(centred && "text-center", className)}>
      <p
        className={cn(
          reveal(),
          "mb-4 text-sm font-semibold uppercase tracking-[0.3em]",
          onDark ? "text-gold-400" : "text-gold-500",
        )}
      >
        {heading.label}
      </p>
      <h2
        className={cn(
          reveal(),
          "font-serif text-4xl font-light sm:text-5xl lg:text-6xl",
          onDark && "text-white",
        )}
        style={delay(80)}
      >
        <SplitTitle text={heading.title} onDark={onDark} />
      </h2>
      <div
        aria-hidden="true"
        className={cn(reveal(), "gold-divider mt-8", centred && "mx-auto")}
        style={delay(160)}
      />
      {heading.subtitle && (
        <p
          className={cn(
            reveal(),
            "mt-6 max-w-xl text-base",
            centred && "mx-auto",
            onDark ? "text-white/50" : "text-charcoal/50",
          )}
          style={delay(220)}
        >
          {heading.subtitle}
        </p>
      )}
    </div>
  );
}
