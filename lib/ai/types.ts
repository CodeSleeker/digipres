/**
 * AI SMS generation — provider-agnostic contract.
 *
 * The app depends on the `SmsGenerator` port, not on any provider. Concrete
 * adapters (OpenAI, Anthropic) plus a no-key template fallback implement it;
 * the factory in ./index picks one from env. See ./prompt and ./validate for
 * the shared guardrails both real providers are held to.
 */

export const SMS_MAX_CHARS = 320;

export const SMS_TONES = ["professional", "warm", "friendly", "short"] as const;
export type SmsTone = (typeof SMS_TONES)[number];

export const SMS_TONE_LABEL: Record<SmsTone, string> = {
  professional: "Professional",
  warm: "Warm",
  friendly: "Friendly",
  short: "Short & sweet",
};

/** Languages offered in the UI; the value is the name passed to the model. */
export const SMS_LANGUAGES = [
  "English",
  "Filipino",
  "Cebuano",
  "Spanish",
] as const;
export type SmsLanguage = (typeof SMS_LANGUAGES)[number];

export interface SmsGenInput {
  businessType: string;
  ownerName: string;
  businessName: string;
  customerName: string;
  service?: string;
  tone: SmsTone;
  language: string;
  count: number;
}

export interface SmsGenerator {
  /** "openai" | "anthropic" | "template" — surfaced to the UI. */
  readonly provider: string;
  /** Returns raw candidate messages; the caller validates and trims them. */
  generate(input: SmsGenInput): Promise<string[]>;
}

export interface SmsVariation {
  text: string;
  length: number;
}
