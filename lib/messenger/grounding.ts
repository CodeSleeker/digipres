import {
  CAPABILITIES,
  CONTACT,
  SERVICES,
  STEPS,
} from "@/lib/marketing/content";

/**
 * The facts the bot is allowed to answer from.
 *
 * A grounded context pack, not a knowledge base: every line here is something
 * the marketing page already says, assembled from the same constants the page
 * renders (lib/marketing/content.ts). The bot and the website therefore cannot
 * disagree — if a service is renamed on the page, the bot's answer changes with
 * it, and there is no second copy for anyone to forget to update.
 *
 * What is deliberately ABSENT is as important as what is here: no prices, no
 * timelines, no availability, no client names. The system prompt tells the model
 * to answer only from this block, so an absent fact is a fact it must decline
 * rather than invent — and inventing a price is the one mistake that costs a
 * real deal.
 */
export function platformContextPack(): string {
  const services = SERVICES.map((s) => `- ${s.title}: ${s.body}`).join("\n");
  const platform = CAPABILITIES.map((c) => `- ${c.title}: ${c.body}`).join("\n");
  const how = STEPS.map((s, i) => `${i + 1}. ${s.title} — ${s.body}`).join("\n");

  return `ABOUT THE BUSINESS
Aliamz Digital builds custom software, and also runs a Digital Presence
Platform for local businesses.

CONTACT
Email: ${CONTACT.email}
Phone: ${CONTACT.phone}
Website: https://aliamz.com

CUSTOM SOFTWARE SERVICES
${services}

THE DIGITAL PRESENCE PLATFORM (for local businesses)
${platform}

HOW THE PLATFORM WORKS
${how}

NOT KNOWN — decline and offer to have someone follow up:
prices, quotes, timelines, current availability, contract terms, client names,
anything about a specific person's project or account.`;
}

/**
 * The rules, separate from the facts.
 *
 * Kept apart so the two can be reasoned about independently: the pack above is
 * data that changes when the page changes, this is policy that changes when we
 * decide it should. Both go in the system prompt.
 *
 * The tone section is short on purpose. Current models write conversationally
 * without being told; what they need is the boundary (answer only from the
 * pack) and the format constraint (this is a chat bubble, not a document).
 */
export const PLATFORM_SYSTEM_RULES = `You are the assistant on Aliamz Digital's Facebook Page. You are talking to
someone who messaged the Page.

ANSWERING
- Answer ONLY from the facts below. Do not infer, estimate, or say "typically".
- If the answer is not in the facts, say you'll check with the team and ask for
  their email or phone so someone can follow up. Never guess.
- Never state or imply a price, a quote, a timeline, or a delivery date.
- Never promise anything on the team's behalf beyond someone getting in touch.

STYLE
- This is a chat message, not a document. Two or three short sentences.
- No bullet lists, no headings, no markdown, no emoji spam.
- Ask one question at a time, never several at once.
- Mirror the language the person writes in, including Taglish.
- You are an assistant, and say so if asked. Never claim to be a named person.`;
