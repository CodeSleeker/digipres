import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex cursor-pointer items-center gap-3 font-heading text-base tracking-[3px] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold max-[768px]:min-h-12 max-[768px]:px-7 max-[768px]:py-[0.9rem]";

const variants = {
  primary:
    "relative overflow-hidden bg-gold px-9 py-4 text-black hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(201,169,110,0.35)] before:absolute before:inset-0 before:-translate-x-full before:bg-gold-light before:transition-transform before:duration-[400ms] before:content-[''] hover:before:translate-x-0",
  outline:
    "border border-dark-border bg-transparent px-9 py-4 text-white hover:-translate-y-0.5 hover:border-gold hover:text-gold",
} as const;

type Variant = keyof typeof variants;

interface CommonProps {
  variant?: Variant;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
}

/** Renders the mockup's `.btn-primary` / `.btn-outline` as a link. */
export function ButtonLink({
  href,
  variant = "primary",
  arrow,
  children,
  className,
}: CommonProps & { href: string }) {
  return (
    <a href={href} className={cn(base, variants[variant], className)}>
      <span className="relative z-[1]">{children}</span>
      {arrow && <span className="relative z-[1]">→</span>}
    </a>
  );
}

/** Same styling as a real `<button>` (used by the booking form submit). */
export function ButtonAction({
  variant = "primary",
  arrow,
  children,
  className,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      <span className="relative z-[1]">{children}</span>
      {arrow && <span className="relative z-[1]">→</span>}
    </button>
  );
}
