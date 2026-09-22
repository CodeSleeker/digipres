import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Form field chrome for the enquiry, on the charcoal ground.
 *
 * Plain elements rather than the shadcn primitives the barber form uses: those
 * carry the platform's own token set and every one would need its defaults
 * overridden here. The label/input pairing is the part that matters for
 * accessibility, and that is explicit below.
 *
 * The inputs sit on the dark CTA section, so the surface is the mockup's glass
 * treatment rather than paper: a hairline gold border, a translucent fill, and
 * a gold focus ring at 3px — the same ring the rest of the template uses, so
 * keyboard focus looks the same everywhere.
 *
 * CONTRAST. The glass fill lifts the ground to roughly #282828, which is what
 * the white opacities here are measured against — not the charcoal behind it.
 * Labels and hints were originally set at the mockup's 45% and 30%, measuring
 * 4.2:1 and 2.7:1; both are small text and both failed AA. They are raised to
 * the smallest step that clears 4.5:1 with room to spare. Same trade the
 * retreat's sage and clay tokens make in app/globals.css: the hue is the
 * mockup's, the lightness is whatever legibility costs.
 */
export const fieldClass = cn(
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3",
  "text-sm text-white placeholder:text-white/45",
  "transition-[border-color,box-shadow,background-color] duration-300 outline-none",
  "focus:border-gold-400/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(201,169,60,0.18)]",
  // 16px on small screens: anything less makes iOS Safari zoom the page on focus.
  "max-[640px]:text-base",
);

export const selectClass = cn(
  fieldClass,
  "cursor-pointer appearance-none bg-no-repeat pr-9",
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23c9a93c' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")]",
  "bg-[position:right_0.9rem_center]",
  // A dark <option> list: browsers paint the popup with the element's own
  // colours, and white-on-white options are unreadable in Chrome on Windows.
  "[&>option]:bg-charcoal [&>option]:text-white",
);

export const textareaClass = cn(fieldClass, "min-h-28 resize-y");

export function Field({
  id,
  label,
  children,
  className,
  hint,
  required = false,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/60"
      >
        {label}
        {/* The asterisk is decoration; `required` on the input is what actually
            announces the requirement, so this is hidden from assistive tech
            rather than read out as "asterisk". */}
        {required && (
          <span aria-hidden="true" className="ml-1 text-gold-400">
            *
          </span>
        )}
      </label>
      {children}
      {/* `${id}-hint` is the id the field points at with aria-describedby, so
          the hint is read out with the label rather than sitting beside it
          unannounced. */}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-white/55">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * The box itself.
 *
 * A template literal rather than an inline `className` because the tick is an
 * embedded SVG whose own attributes are single-quoted, so the url() has to be
 * double-quoted — and a JSX attribute string cannot escape a quote.
 */
const checkboxClass = `h-4 w-4 flex-none appearance-none rounded border border-white/25 bg-transparent transition-colors duration-200 checked:border-gold-400 checked:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 checked:bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath d=\'M2.5 6.5l2.5 2.5 4.5-5\' fill=\'none\' stroke=\'%231a1a1a\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")] checked:bg-center checked:bg-no-repeat`;

/**
 * One checkbox in the "services needed" list.
 *
 * A real checkbox, visually replaced rather than hidden: `appearance-none`
 * keeps it in the tab order and in the accessibility tree, where a div styled
 * as a checkbox would be neither.
 */
export function CheckField({
  id,
  name,
  value,
  label,
}: {
  id: string;
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors duration-300 hover:border-gold-400/40 hover:text-white has-[:checked]:border-gold-400/60 has-[:checked]:bg-gold-400/10 has-[:checked]:text-white"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        className={checkboxClass}
      />
      {label}
    </label>
  );
}

/**
 * The inline form response.
 *
 * `role="status"` so the reply is announced without stealing focus, and a
 * FAILURE is styled differently but announced the same way — someone who
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
        "text-sm",
        message ? "mt-4" : "sr-only",
        message?.ok ? "text-gold-300" : "text-[#f0a6a6]",
      )}
    >
      {message?.text ?? ""}
    </p>
  );
}
