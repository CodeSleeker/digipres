"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ForgotState = {};

const fieldClass =
  "h-auto w-full rounded-none border border-dark-border bg-charcoal px-4 py-3 text-sm text-white shadow-none outline-none transition-colors focus-visible:border-gold focus-visible:ring-0";

export function ForgotForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  if (state.sent) {
    return (
      <div className="text-center text-sm text-gray-light">
        <p>
          If an account exists for that email, a password-reset link is on its
          way. Check your inbox (and spam).
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-xs uppercase tracking-[2px] text-gold hover:text-gold-light"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-[0.7rem] uppercase tracking-[2px] text-gray"
        >
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@business.com"
          className={fieldClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="mt-1 w-full rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
      >
        {isPending ? "SENDING…" : "SEND RESET LINK"}
      </Button>

      <Link
        href="/login"
        className="text-center text-xs uppercase tracking-[2px] text-gray hover:text-gold"
      >
        ← Back to sign in
      </Link>
    </form>
  );
}
