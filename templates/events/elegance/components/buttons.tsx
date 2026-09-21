import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The two button treatments from the mockup.
 *
 * `.btn-gold` and `.btn-outline-gold` live in app/globals.css because both
 * carry a pseudo-element gradient that Tailwind utilities can't express: the
 * fill crossfades on hover rather than swapping, which is the whole character
 * of the control. The classes here only place and size them.
 */

const SHAPE =
  "inline-flex items-center justify-center rounded-full text-sm font-semibold uppercase tracking-wider";

/** Solid gold, dark text. The primary action on any surface. */
export function BtnGold({
  href,
  children,
  className,
  ...rest
}: {
  href: string;
  children: ReactNode;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  return (
    <a href={href} className={cn("btn-gold", SHAPE, className)} {...rest}>
      {/* The label sits above the crossfading ::before fill. Without the span
          the gradient paints over the text on hover. */}
      <span>{children}</span>
    </a>
  );
}

/** Gold hairline, gold text, filling in on hover. The secondary action. */
export function BtnOutline({
  href,
  children,
  className,
  ...rest
}: {
  href: string;
  children: ReactNode;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  return (
    <a
      href={href}
      className={cn("btn-outline-gold", SHAPE, className)}
      {...rest}
    >
      {children}
    </a>
  );
}

/**
 * The same solid treatment as a real button.
 *
 * Used for the enquiry form's submit. An anchor styled as a button is the
 * wrong element for something that submits a form — it isn't reachable by
 * Enter from a field, and a screen reader announces a link.
 */
export function BtnGoldSubmit({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  return (
    <button
      type="submit"
      className={cn(
        "btn-gold",
        SHAPE,
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
    </button>
  );
}
