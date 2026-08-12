"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  SMS_LANGUAGES,
  SMS_MAX_CHARS,
  SMS_TONES,
  SMS_TONE_LABEL,
} from "@/lib/ai/types";
import {
  generateSmsVariations,
  type SmsGenState,
} from "@/features/ai-messages/actions";

const fieldClass =
  "h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none transition-colors focus:border-admin-accent";

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
  template: "built-in templates",
};

export function SmsGenerator({
  defaults,
}: {
  defaults: { businessType: string; ownerName: string; businessName: string };
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SmsGenState | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const content = {
      businessType: fd.get("businessType"),
      ownerName: fd.get("ownerName"),
      businessName: fd.get("businessName"),
      customerName: fd.get("customerName"),
      service: fd.get("service"),
      tone: fd.get("tone"),
      language: fd.get("language"),
      count: Number(fd.get("count")),
    };
    const payload = new FormData();
    payload.set("content", JSON.stringify(content));
    start(async () => setResult(await generateSmsVariations(payload)));
  }

  async function copy(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Business type">
          <input
            name="businessType"
            defaultValue={defaults.businessType}
            placeholder="Barber shop, bakery, retreat…"
            className={fieldClass}
          />
        </Field>
        <Field label="Business name">
          <input
            name="businessName"
            defaultValue={defaults.businessName}
            className={fieldClass}
          />
        </Field>
        <Field label="Owner name">
          <input
            name="ownerName"
            defaultValue={defaults.ownerName}
            placeholder="Michael Cruz"
            className={fieldClass}
          />
        </Field>
        <Field label="Customer name">
          <input name="customerName" placeholder="John" className={fieldClass} />
        </Field>
        <Field label="Service (optional)">
          <input
            name="service"
            placeholder="Haircut, check-up…"
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tone">
            <select name="tone" defaultValue="warm" className={fieldClass}>
              {SMS_TONES.map((t) => (
                <option key={t} value={t}>
                  {SMS_TONE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language">
            <select name="language" defaultValue="English" className={fieldClass}>
              {SMS_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Variations">
          <select name="count" defaultValue="3" className={fieldClass}>
            <option value="3">3 variations</option>
            <option value="5">5 variations</option>
          </select>
        </Field>

        <Button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-none bg-admin-accent font-admin-heading tracking-[2px] text-admin-on-accent hover:bg-admin-accent-hover"
        >
          {pending ? "GENERATING…" : "GENERATE"}
        </Button>
        {result?.error && (
          <p className="text-sm text-destructive">{result.error}</p>
        )}
      </form>

      <div className="grid content-start gap-3">
        {!result && (
          <p className="text-sm text-admin-muted">
            Fill in the details and generate natural, on-brand SMS variations.
          </p>
        )}
        {result?.variations && result.variations.length > 0 && (
          <>
            <p className="text-xs text-admin-muted">
              {result.usedFallback
                ? "Filled with built-in templates (no AI provider configured or reachable)."
                : `Generated with ${PROVIDER_LABEL[result.provider ?? ""] ?? result.provider}.`}
            </p>
            {result.variations.map((v, i) => (
              <div
                key={i}
                className="border border-admin-line bg-admin-panel p-4"
              >
                <p className="text-sm leading-relaxed text-admin-fg/80">
                  {v.text}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-xs ${v.length > SMS_MAX_CHARS ? "text-destructive" : "text-admin-muted"}`}
                  >
                    {v.length}/{SMS_MAX_CHARS}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(v.text, i)}
                    className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
                  >
                    {copied === i ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
