"use server";

import { getOwnerContext } from "@/lib/tenant/business-context";
import { featureError } from "@/lib/features/guard";
import { generateSmsSchema } from "@/schemas/sms-generation";
import { getSmsGenerator, TemplateGenerator } from "@/lib/ai";
import { filterVariations } from "@/lib/ai/validate";
import type { SmsVariation } from "@/lib/ai/types";

export type SmsGenState = {
  variations?: SmsVariation[];
  provider?: string;
  usedFallback?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Generate multiple SMS variations. Uses the configured AI provider, applies
 * the guardrails, and tops up from the template generator if too few pass (or
 * the provider is unavailable/errors) — so the caller always gets `count`
 * compliant messages.
 */
export async function generateSmsVariations(
  formData: FormData,
): Promise<SmsGenState> {
  // Gated: generation costs AI provider credits, so this must be enforced
  // server-side, not just hidden in the nav.
  const { supabase, businessId } = await getOwnerContext();
  const denied = await featureError(supabase, businessId, "ai_messages");
  if (denied) return { error: denied };

  const raw = formData.get("content");
  let json: unknown;
  try {
    json = typeof raw === "string" ? JSON.parse(raw) : {};
  } catch {
    return { error: "Could not read the form." };
  }

  const parsed = generateSmsSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(
      parsed.error.flatten().fieldErrors,
    )) {
      if (messages && messages.length) fieldErrors[key] = messages;
    }
    return { error: "Please complete the required fields.", fieldErrors };
  }

  const input = parsed.data;
  const generator = getSmsGenerator();

  let aiValid: string[] = [];
  try {
    aiValid = filterVariations(await generator.generate(input), input);
  } catch (error) {
    console.error("[ai-sms]", error);
    aiValid = [];
  }

  const variations = aiValid.slice(0, input.count);
  let provider = generator.provider;
  let usedFallback = generator.provider === "template";

  if (variations.length < input.count) {
    const fill = filterVariations(
      await new TemplateGenerator().generate(input),
      input,
    );
    for (const text of fill) {
      if (variations.length >= input.count) break;
      if (!variations.includes(text)) variations.push(text);
    }
    usedFallback = true;
    if (aiValid.length === 0) provider = "template";
  }

  return {
    provider,
    usedFallback,
    variations: variations.map((text) => ({ text, length: text.length })),
  };
}
