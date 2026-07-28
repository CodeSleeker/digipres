"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/lib/auth/actions";
import { BRAND } from "@/components/marketing/theme";

const initialState: LoginState = {};

/**
 * Client login form. Submits to the `login` server action via `useActionState`,
 * which gives us the returned error message and a pending flag without any
 * client-side data fetching. Credentials are handled entirely by the action.
 *
 * Styled from the Aliamz brand tokens, not the tenant template — this is the
 * platform's own surface (see components/marketing/theme.ts).
 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={BRAND.label}>
            Password
          </label>
          <Link
            href="/forgot-password"
            className={`text-xs ${BRAND.quietLink}`}
          >
            Forgot?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
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
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
