"use client";

import { useActionState } from "react";
import { updateBusiness } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldClass } from "./form-kit";
import { SavedNotice } from "@/components/ui/saved-notice";
import { Spinner } from "@/components/ui/submit-button";

const PLATFORMS = [
  { name: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/…" },
  {
    name: "instagramUrl",
    label: "Instagram",
    placeholder: "https://instagram.com/…",
  },
  { name: "tiktokUrl", label: "TikTok", placeholder: "https://tiktok.com/@…" },
] as const;

/**
 * The footer's social icons.
 *
 * These are NOT stored in `footer_content`: the same three links also feed the
 * contact section's SOCIALS card and the site's JSON-LD `sameAs`. Keeping one
 * copy on the business record is what stops the page and the structured data
 * from drifting apart. So this posts to `updateBusiness` — a genuine partial
 * update, since only the fields present in the form are read.
 *
 * An empty field means the icon is not rendered at all.
 */
export function SocialLinksForm({
  defaults,
}: {
  defaults: { facebookUrl: string; instagramUrl: string; tiktokUrl: string };
}) {
  const [state, action, pending] = useActionState(updateBusiness, {});

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <div>
        <h2 className="font-admin-heading text-lg tracking-[2px] text-admin-fg">
          Social links
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-admin-muted">
          Each icon appears in your footer only when its link is filled in.
          Clear a field to remove that icon.
        </p>
      </div>

      {PLATFORMS.map((platform) => (
        <div key={platform.name} className="flex flex-col gap-1.5">
          <Label
            htmlFor={platform.name}
            className="text-[0.7rem] font-normal uppercase tracking-[1.5px] text-admin-muted"
          >
            {platform.label}
          </Label>
          <Input
            id={platform.name}
            name={platform.name}
            type="url"
            inputMode="url"
            defaultValue={defaults[platform.name]}
            placeholder={platform.placeholder}
            className={fieldClass}
          />
          {state.fieldErrors?.[platform.name]?.[0] && (
            <p role="alert" className="text-xs text-destructive">
              {state.fieldErrors[platform.name]![0]}
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4 border-t border-admin-line pt-5">
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded-none bg-admin-accent font-admin-heading tracking-[2px] text-admin-on-accent hover:bg-admin-accent-hover"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              SAVING…
            </span>
          ) : (
            "SAVE LINKS"
          )}
        </Button>
        <SavedNotice token={state.success ? state : null}>
          Saved — changes are live.
        </SavedNotice>
        {state.error && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
    </form>
  );
}
