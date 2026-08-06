"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createCreation,
  updateCreation,
  type CreationFormState,
} from "@/features/creations/actions";
import type { Creation } from "@/types/subscriber";
import { SubmitButton } from "@/components/ui/submit-button";

const fieldClass =
  "h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none transition-colors focus:border-admin-accent";

/**
 * Writing up something new.
 *
 * The date is prominent and editable because it is not decoration: the weekly
 * digest windows on it, so it decides whether this goes out as news on Sunday.
 * The form says that in as many words — an owner should never discover the
 * consequence by seeing an email arrive.
 */
export function CreationForm({ creation }: { creation?: Creation }) {
  const action = creation ? updateCreation : createCreation;
  const [state, formAction] = useActionState<CreationFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      {creation && <input type="hidden" name="id" value={creation.id} />}

      <Field label="Name" error={state.fieldErrors?.name}>
        <input
          name="name"
          required
          defaultValue={creation?.name ?? ""}
          placeholder="Pistachio Rose Cake"
          className={fieldClass}
        />
      </Field>

      <Field label="Description" error={state.fieldErrors?.description}>
        <textarea
          name="description"
          rows={4}
          defaultValue={creation?.description ?? ""}
          placeholder="Almond and pistachio sponge, rose infused cream."
          className={`${fieldClass} resize-y`}
        />
        <p className="mt-1 text-xs text-admin-muted">
          This is what subscribers read in the email.
        </p>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price (optional)" error={state.fieldErrors?.price}>
          <input
            name="price"
            defaultValue={creation?.price ?? ""}
            placeholder="₱2,450"
            className={fieldClass}
          />
        </Field>

        <Field label="Published on" error={state.fieldErrors?.publishedAt}>
          <input
            name="publishedAt"
            type="date"
            defaultValue={(creation?.publishedAt ?? "").slice(0, 10)}
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-admin-muted">
            Defaults to today. Anything published since the last email goes out
            in the next one.
          </p>
        </Field>
      </div>

      <Field label="Photo URL (optional)" error={state.fieldErrors?.imageUrl}>
        <input
          name="imageUrl"
          defaultValue={creation?.imageUrl ?? ""}
          placeholder="https://…"
          className={fieldClass}
        />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-admin-line pt-5">
        <SubmitButton
          pendingLabel="Saving…"
          className="bg-admin-accent px-5 py-2 font-admin-heading text-sm tracking-[2px] text-admin-on-accent transition-colors hover:bg-admin-accent-hover"
        >
          {creation ? "SAVE CHANGES" : "ADD IT"}
        </SubmitButton>
        <Link
          href="/admin/creations"
          className="text-xs uppercase tracking-[2px] text-admin-muted transition-colors hover:text-admin-accent"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
        {label}
      </span>
      {children}
      {error?.[0] && (
        <span className="text-xs text-destructive">{error[0]}</span>
      )}
    </label>
  );
}
