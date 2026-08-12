import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Form controls for the booking section, which sits on a photograph.
 *
 * Plain elements rather than the shadcn primitives the admin uses: those carry
 * the back office's palette and radius, and this design is square-cornered
 * ivory-on-dark. Same reasoning as the patisserie's own field set.
 *
 * The border is 0.42 → 0.55 alpha of ivory rather than the design's hairline
 * value: a field's outline IS the field, and at hairline weight over a
 * photograph there is nothing to see.
 */
const control =
  "w-full rounded-[2px] border border-[rgba(245,241,232,0.34)] bg-[rgba(32,33,30,0.35)] px-4 py-3 text-[0.9rem] font-light text-ivory placeholder:text-[rgba(245,241,232,0.45)] transition-colors duration-300 focus:border-[rgba(245,241,232,0.8)] focus:outline-none";

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 text-left", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[0.62rem] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.72)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(control, "min-h-24 resize-y", props.className)}
    />
  );
}

/**
 * `color-scheme: dark` is not decoration here: without it the native select
 * arrow and the date picker's own popup render as black-on-black in Chrome on
 * a dark control, which is the kind of thing that only shows up on a real
 * device.
 */
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(control, "[color-scheme:dark]", props.className)}
    />
  );
}
