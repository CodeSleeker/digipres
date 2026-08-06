import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { SectionHeading } from "@/types/business";
import { cn } from "@/lib/utils";
import { LinkUnderline } from "./buttons";
import { stagger } from "../lib/reveal";

/**
 * Uppercase eyebrow with a leading mark (mockup `.eyebrow`).
 *
 * `dot` swaps the warm rule for a mint dot. Both are drawn with `before:`
 * because they are ornament — nothing in the accessible name changes.
 */
export function Eyebrow({
  children,
  dot,
  className,
  style,
}: {
  children: ReactNode;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-[0.6rem] text-[0.7rem] font-semibold uppercase tracking-[0.19em] text-ink-45",
        "before:content-['']",
        dot
          ? "before:h-[7px] before:w-[7px] before:rounded-full before:bg-mint-deep"
          : "before:h-px before:w-[22px] before:bg-warm",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Section title. The mockup breaks these across lines and italicises the
 * second half; a title carrying a newline gets that treatment, and one that
 * doesn't simply wraps.
 */
export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-display text-[clamp(2rem,1.35rem+2.5vw,3.15rem)] font-medium leading-[1.1] tracking-[-0.02em] text-ink [text-wrap:balance]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Title text split so the closing clause is set in italic — the mockup's
 * `<br><span class="ital">` treatment, driven by content rather than markup.
 *
 * A title of one clause renders plain, so a tenant who writes "Best sellers"
 * gets exactly that.
 */
export function SplitTitle({ text }: { text: string }) {
  const parts = splitTitle(text);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {i === parts.length - 1 && parts.length > 1 ? (
            <span className="font-normal italic">{part}</span>
          ) : (
            part
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Break a title into its lines.
 *
 * An explicit newline wins — that is the owner saying where the break goes. A
 * long single line is split at the comma, which is where these titles are
 * written to turn ("Made in the morning, finished by hand"). Anything else is
 * left alone: a guessed break in the wrong place is worse than none.
 */
function splitTitle(text: string): string[] {
  const explicit = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (explicit.length > 1) return explicit;

  const comma = text.indexOf(",");
  if (comma > 0 && comma < text.length - 2 && text.length > 28) {
    return [text.slice(0, comma + 1).trim(), text.slice(comma + 1).trim()];
  }
  return [text];
}

/** Left-aligned section header: eyebrow, title, lead paragraph. */
export function SectionHead({
  heading,
  className,
  dot,
}: {
  heading: SectionHeading;
  className?: string;
  dot?: boolean;
}) {
  return (
    <div className={cn("reveal max-w-[640px]", className)}>
      <Eyebrow dot={dot} className="mb-[1.1rem]">
        {heading.label}
      </Eyebrow>
      <SectionTitle>
        <SplitTitle text={heading.title} />
      </SectionTitle>
      {heading.subtitle && (
        <p className="mt-[1.15rem] text-[clamp(1.02rem,0.97rem+0.3vw,1.185rem)] leading-[1.68] text-ink-70 [text-wrap:pretty]">
          {heading.subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Header row: the section head on the left, an optional link or control on the
 * right (mockup `.head-row`).
 */
export function HeadRow({
  heading,
  children,
  className,
}: {
  heading: SectionHeading;
  /** Replaces the heading's own link when supplied — used by the rail arrows. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-10",
        className,
      )}
    >
      <SectionHead heading={heading} />
      {children ??
        (heading.link && (
          <LinkUnderline
            href={heading.link.href}
            className="reveal"
            style={stagger(1)}
            {...externalLinkProps(heading.link.href)}
          >
            {heading.link.label}
          </LinkUnderline>
        ))}
    </div>
  );
}

/**
 * `noopener` on anything leaving the site. `noreferrer` alongside it because
 * older browsers implement only the latter — a tenant can paste any URL here,
 * so the hardening has to be automatic rather than remembered.
 */
export function externalLinkProps(href: string) {
  return /^https?:\/\//i.test(href)
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
}
