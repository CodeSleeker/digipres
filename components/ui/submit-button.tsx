"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * A submit button that reports its own progress.
 *
 * Exists for SERVER-rendered forms (`<form action={serverAction}>`), which have
 * no `useActionState` or `useTransition` to read a pending flag from. React's
 * `useFormStatus` supplies one, but only to a component rendered INSIDE the
 * form — which is exactly what this is.
 *
 * Without it, a form posting to a server action looks completely inert while it
 * runs: no spinner, no disabled state, nothing to say the click registered. The
 * usual result is the user pressing it again.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  ...rest
}: React.ComponentProps<"button"> & {
  /** Shown while the action runs, e.g. "Saving…". */
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || rest.disabled}
      // `aria-busy` is what tells a screen reader the control is working; the
      // label swap alone is easy to miss mid-announcement.
      aria-busy={pending}
      className={cn("disabled:opacity-60", className)}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * A CSS-only spinner. `border-current` inherits the button's own colour, so it
 * works on the gold, outline and destructive variants without configuration.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-3 w-3 shrink-0 animate-spin rounded-full border border-current border-r-transparent",
        className,
      )}
    />
  );
}
