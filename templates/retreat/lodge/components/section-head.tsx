import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The small-caps label above a heading (mockup `.eyebrow`), with its 32px rule.
 *
 * `plain` drops the rule — the booking CTA centres its label, where a rule on
 * one side only would read as a mistake.
 */
export function Eyebrow({
  children,
  plain,
  className,
  style,
}: {
  children: ReactNode;
  plain?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      style={style}
      className={cn(
        // The size is a literal rather than a custom property on purpose: an
        // arbitrary `var(…)` is ambiguous to tailwind-merge, which cannot tell
        // a length from a colour — and the callers that recolour this label
        // would then have their `text-…` merged over the size instead.
        "flex items-center gap-[0.85rem] text-[0.685rem] font-medium uppercase tracking-[0.24em] text-sage max-[720px]:text-[0.645rem]",
        !plain &&
          "before:block before:h-px before:w-8 before:flex-none before:bg-current before:opacity-60 before:content-[''] max-[520px]:before:w-[22px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * A headline whose last line is set in italic.
 *
 * The emphasis is positional rather than stored, exactly as on the patisserie
 * template: the alternative is a per-line flag the CMS would have to offer, and
 * "the closing line is the emphasised one" is true of every heading in this
 * design. A single-line heading is never italicised — with nothing to contrast
 * against, it would just be a slanted heading.
 */
export function ItalicLastLine({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={`${i}-${line}`}>
          {i > 0 && <br />}
          {i === lines.length - 1 && lines.length > 1 ? (
            <span className="italic">{line}</span>
          ) : (
            line
          )}
        </Fragment>
      ))}
    </>
  );
}
