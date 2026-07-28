"use client";

import { useActionState } from "react";
import { updatePassword, type ResetState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ResetState = {};

const fieldClass =
  "h-auto w-full rounded-none border border-dark-border bg-charcoal px-4 py-3 text-sm text-white shadow-none outline-none transition-colors focus-visible:border-gold focus-visible:ring-0";

export function ResetForm() {
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-[0.7rem] uppercase tracking-[2px] text-gray"
        >
          New password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="confirm"
          className="text-[0.7rem] uppercase tracking-[2px] text-gray"
        >
          Confirm password
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {isPending ? "SAVING…" : "SET NEW PASSWORD"}
      </Button>
    </form>
  );
}
