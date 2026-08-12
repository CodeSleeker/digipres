import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The mockup's `.btn`. Square-cornered (2px), small caps, wide tracking — the
 * shape carries as much of the design as the colour does, so the radius is a
 * token rather than a rounded pill.
 *
 * `light` and `ghost-light` are the two that sit on a photograph or a dark
 * ground; `solid` and `ghost` are for the ivory sections. Both pairs are needed
 * because the same button appears on both, and inverting one is not the same as
 * having the other (a transparent hover over a photograph has to reveal the
 * photograph, not a colour).
 */
const base =
  "group/btn inline-flex min-h-[52px] items-center gap-3 rounded-[2px] border px-[1.7rem] py-[0.95rem] text-[0.7rem] font-semibold uppercase tracking-[0.17em] transition-[background-color,color,border-color] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]";

const variants = {
  solid: "border-bark bg-bark text-ivory hover:border-forest hover:bg-forest",
  // The transparent hover has to stay readable over whatever the photograph is
  // doing there, so the label takes the on-photo shadow for that state only —
  // on the ivory fill it would be a shadow on a solid button.
  light:
    "border-ivory bg-ivory text-bark hover:bg-transparent hover:text-ivory hover:lodge-on-photo",
  ghost:
    "border-[var(--lodge-rule)] text-bark hover:border-bark hover:bg-bark hover:text-ivory",
  // Sits directly on the photograph: a 0.42 border all but disappears over a
  // bright patch, and the outline IS the button.
  ghostLight:
    "lodge-on-photo border-[rgba(245,241,232,0.6)] text-ivory hover:border-ivory hover:bg-ivory hover:text-bark hover:[text-shadow:none]",
} as const;

export function Btn({
  href,
  variant = "solid",
  arrow,
  children,
  className,
  ...props
}: {
  href: string;
  variant?: keyof typeof variants;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "children" | "className"
>) {
  return (
    <a
      href={href}
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {children}
      {arrow && <Arrow />}
    </a>
  );
}

/** The trailing glyph, which steps forward on hover. Decorative. */
export function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="transition-transform duration-500 ease-[cubic-bezier(.22,.61,.36,1)] group-hover/btn:translate-x-[5px]"
    >
      →
    </span>
  );
}
