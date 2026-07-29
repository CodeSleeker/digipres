"use client";

import { useActionState } from "react";
import { updateBusiness } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldClass } from "./form-kit";

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
        <h2 className="font-heading text-lg tracking-[2px] text-white">
          Social links
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-gray">
          Each icon appears in your footer only when its link is filled in.
          Clear a field to remove that icon.
        </p>
      </div>

      {PLATFORMS.map((platform) => (
        <div key={platform.name} className="flex flex-col gap-1.5">
          <Label
            htmlFor={platform.name}
            className="text-[0.7rem] font-normal uppercase tracking-[1.5px] text-gray"
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

      <div className="flex flex-wrap items-center gap-4 border-t border-dark-border pt-5">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
        >
          {pending ? "SAVING…" : "SAVE LINKS"}
        </Button>
        {state.success && (
          <span className="text-sm text-[#5bbf7b]">
            Saved — changes are live.
          </span>
        )}
        {state.error && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
    </form>
  );
}
