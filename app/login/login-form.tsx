"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

const fieldClass =
  "h-auto w-full rounded-none border border-dark-border bg-charcoal px-4 py-3 text-sm text-white shadow-none outline-none transition-colors focus-visible:border-gold focus-visible:ring-0";

/**
 * Client login form. Submits to the `login` server action via `useActionState`,
 * which gives us the returned error message and a pending flag without any
 * client-side data fetching. Credentials are handled entirely by the action.
 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="password"
            className="text-[0.7rem] uppercase tracking-[2px] text-gray"
          >
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-[0.7rem] text-gray transition-colors hover:text-gold"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
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
        {isPending ? "SIGNING IN…" : "SIGN IN"}
      </Button>
    </form>
  );
}
