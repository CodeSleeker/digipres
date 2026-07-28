import { SMS_MAX_CHARS, type SmsGenInput, type SmsTone } from "./types";

/** First word of a name ("Michael Cruz" → "Michael"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

const TONE_GUIDANCE: Record<SmsTone, string> = {
  professional: "polished and respectful, but still personable",
  warm: "warm and heartfelt, like a genuine thank-you from a person",
  friendly: "casual and friendly, like texting a returning regular",
  short: "very short and to the point — one or two sentences",
};

/**
 * System prompt shared by the OpenAI and Anthropic adapters. Encodes the hard
 * requirements (natural, non-spammy, ≤320 chars, owner's name present) so both
 * providers produce comparable output.
 */
export function buildSystemPrompt(input: SmsGenInput): string {
  return [
    "You write short SMS messages that a local business owner personally sends to a customer after a visit.",
    "",
    "Hard requirements for EVERY message:",
    `- Sound natural and human — like a real person typed it. Never salesy or spammy.`,
    `- Include the owner's first name naturally, e.g. "Hi John, Michael here from ABC Clinic...".`,
    `- At most ${SMS_MAX_CHARS} characters. Prefer shorter.`,
    "- Do NOT use ALL-CAPS words, more than one exclamation mark, emojis, links, or marketing phrases like FREE, WINNER, ACT NOW, CLICK, LIMITED TIME.",
    "- Personalize with the customer's name, the business name, and the service when provided.",
    `- Write in ${input.language}.`,
    `- Tone: ${TONE_GUIDANCE[input.tone]}.`,
    "",
    `Return ONLY a JSON object of the form {"variations": ["...", "..."]} with exactly ${input.count} distinct variations. No commentary before or after the JSON.`,
  ].join("\n");
}

/** The concrete inputs for one generation request. */
export function buildUserPrompt(input: SmsGenInput): string {
  const lines = [
    `Business type: ${input.businessType}`,
    `Business name: ${input.businessName}`,
    `Owner name: ${input.ownerName}`,
    `Customer name: ${input.customerName}`,
  ];
  if (input.service) lines.push(`Service: ${input.service}`);
  lines.push(
    `Write ${input.count} distinct ${input.tone} SMS variations following all the rules.`,
  );
  return lines.join("\n");
}
