"use client";

import { useActionState } from "react";
import { updatePassword, type ResetState } from "@/lib/auth/actions";
import { BRAND } from "@/components/marketing/theme";

const initialState: ResetState = {};

export function ResetForm() {
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={BRAND.label}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className={BRAND.field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirm" className={BRAND.label}>
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {isPending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
