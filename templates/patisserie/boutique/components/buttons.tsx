import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "./icons";

/**
 * Pill buttons (mockup `.btn` and variants).
 *
 * The `accent` fill carries INK, not white: the warm accent at full strength
 * measures 6.4:1 against ink and only 2.2:1 against white, so white type on it
 * would fail at the size these labels are set.
 */
const base =
  "group/btn inline-flex min-h-11 cursor-pointer items-center justify-center gap-[0.6rem] whitespace-nowrap rounded-full border px-[1.65rem] py-[0.92rem] text-[0.875rem] font-semibold tracking-[0.015em] transition-[transform,box-shadow,background-color,color,border-color] duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_rgba(47,42,38,0.55)] active:translate-y-0";

const variants = {
  solid: "border-ink bg-ink text-paper",
  ghost:
    "border-[rgba(47,42,38,0.2)] bg-transparent text-ink hover:border-ink hover:shadow-[0_12px_24px_-16px_rgba(47,42,38,0.4)]",
  accent: "border-warm bg-warm text-ink",
  light: "border-transparent bg-paper text-ink",
} as const;

const sizes = {
  md: "",
  sm: "px-[1.25rem] py-[0.68rem] text-[0.8125rem]",
} as const;

interface CommonProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
}

export function Btn({
  href,
  variant = "solid",
  size = "md",
  arrow,
  children,
  className,
  ...props
}: CommonProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "children" | "className" | "href"
  > & { href: string }) {
  return (
    <a
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
      {arrow && (
        <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover/btn:translate-x-1" />
      )}
    </a>
  );
}

export function BtnAction({
  variant = "solid",
  size = "md",
  arrow,
  children,
  className,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
      {arrow && (
        <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover/btn:translate-x-1" />
      )}
    </button>
  );
}

/**
 * The understated text link (mockup `.link-u`): an underline drawn from the
 * left on hover, using a background gradient so the rule can animate its width
 * without shifting the text.
 */
export function LinkUnderline({
  href,
  children,
  className,
  style,
  target,
  rel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      style={style}
      className={cn(
        "group/link inline-flex items-center gap-2 pb-0.5 text-[0.85rem] font-semibold text-ink",
        "bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat",
        "transition-[background-size] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px]",
        className,
      )}
    >
      {children}
      <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover/link:translate-x-1" />
    </a>
  );
}
