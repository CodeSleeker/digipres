import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Form field chrome (mockup `.field`).
 *
 * Plain elements rather than the shadcn primitives the barber form uses: those
 * carry the platform's dark token set, and every one of them would need its
 * defaults overridden here. The label/input pairing is the part that matters
 * for accessibility, and that is explicit below.
 */
export const fieldClass =
  "w-full rounded-[10px] border border-[var(--pastry-line)] bg-paper px-[0.9rem] py-[0.72rem] text-[0.875rem] text-ink transition-[border-color,box-shadow,background-color] duration-300 outline-none focus:border-mint-deep focus:bg-snow focus:shadow-[0_0_0_3px_rgba(35,124,108,0.15)] max-[640px]:text-base";

export const selectClass = cn(
  fieldClass,
  "cursor-pointer appearance-none bg-no-repeat pr-[2.1rem]",
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23736A62' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")]",
  "bg-[position:right_0.85rem_center]",
);

export function Field({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-[0.4rem] block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-45"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * The inline form response (mockup `.form-msg`).
 *
 * `role="status"` so the reply is announced without stealing focus, and a
 * FAILURE is styled differently but announced the same way — a customer who
 * cannot see the colour still has to learn their enquiry did not send.
 */
export function FormMessage({
  message,
}: {
  message: { text: string; ok: boolean } | null;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "mt-[0.9rem] rounded-[10px] px-[0.9rem] py-[0.7rem] text-[0.82rem]",
        !message && "hidden",
        message?.ok
          ? "bg-mint-wash text-mint-deep"
          : "bg-pink-wash text-pink-deep",
      )}
    >
      {message?.text}
    </p>
  );
}
