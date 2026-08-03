"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotState } from "@/lib/auth/actions";
import { BRAND } from "@/components/marketing/theme";
import { Spinner } from "@/components/ui/submit-button";

const initialState: ForgotState = {};

export function ForgotForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  if (state.sent) {
    return (
      <div className={`text-sm leading-relaxed ${BRAND.muted}`}>
        <p>
          If an account exists for that email, a password-reset link is on its
          way. Check your inbox (and spam).
        </p>
        <Link href="/login" className={`mt-6 inline-block ${BRAND.link}`}>
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={BRAND.label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@business.com"
          className={BRAND.field}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-[#a8353a]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className={`mt-1 ${BRAND.button}`}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Sending…
          </span>
        ) : (
          "Send reset link"
        )}
      </button>

      <Link href="/login" className={`text-center text-sm ${BRAND.quietLink}`}>
        ← Back to sign in
      </Link>
    </form>
  );
}
