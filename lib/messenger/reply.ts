import { PLATFORM_SYSTEM_RULES, platformContextPack } from "./grounding";
import { AnthropicReplyGenerator } from "./reply-anthropic";
import { OpenAIReplyGenerator } from "./reply-openai";
import type { ReplyGenerator, ReplyResult, ReplyTurn } from "./reply-types";

export type { ReplyGenerator, ReplyResult, ReplyTurn };

/**
 * Turning an inbound message into a reply.
 *
 * The accuracy risk of the whole feature lives here, so the shape is
 * deliberate: whichever provider runs, it is given a fixed block of facts and
 * told to answer only from it. No tools, no retrieval, no browsing — it cannot
 * reach a fact that isn't in the pack, which is what makes "decline rather than
 * guess" enforceable rather than merely requested.
 *
 * The provider is a configuration choice, and both are held to the same
 * grounding: the system prompt is built here, once, and handed to whichever
 * adapter is selected. Neither can quietly ground itself differently.
 */

/**
 * How many previous turns to send.
 *
 * Enough for the thread to make sense, few enough that a long conversation
 * doesn't grow the prompt without bound. The transcript is the whole context —
 * there is no summarisation step yet — so this is also the cost ceiling.
 */
const HISTORY_TURNS = 12;

/**
 * Which provider answers, if any.
 *
 * EXPLICIT, like AI SMS. An API key present for one feature must never switch
 * on another that spends money and speaks to customers — the coupling that let
 * `ANTHROPIC_API_KEY` silently turn AI SMS on. Unset means the bot stores
 * messages and stays silent, which is the safe default for a Page that has
 * never been configured to answer.
 *
 * Keys are per-feature first, shared second: `MESSENGER_OPENAI_API_KEY` before
 * `OPENAI_API_KEY`, so the bot can be billed, rate-limited or revoked on its
 * own — while a single-key setup still just works.
 */
export function getReplyGenerator(
  env: Record<string, string | undefined> = process.env,
): ReplyGenerator | null {
  const provider = (env.MESSENGER_AI_PROVIDER || "").trim().toLowerCase();

  if (provider === "openai") {
    const key =
      env.MESSENGER_OPENAI_API_KEY?.trim() || env.OPENAI_API_KEY?.trim();
    return key ? new OpenAIReplyGenerator(key) : null;
  }

  if (provider === "anthropic") {
    const key =
      env.MESSENGER_ANTHROPIC_API_KEY?.trim() || env.ANTHROPIC_API_KEY?.trim();
    return key ? new AnthropicReplyGenerator(key) : null;
  }

  // Unset, "none", or a typo — all mean the same thing, and all fail toward
  // silence rather than toward an unconfigured model answering a customer.
  return null;
}

/** The grounding pack and the rules, assembled once per turn. */
export function replySystemPrompt(): string {
  return `${PLATFORM_SYSTEM_RULES}\n\n${platformContextPack()}`;
}

/**
 * Generate a reply, or null when we should stay silent and escalate.
 *
 * Null is a real outcome, not just an error path: no provider configured, a
 * refusal, a truncation, or an empty completion all mean the same thing to the
 * caller — a human should take this thread.
 */
export async function generateReply(
  history: ReplyTurn[],
  incoming: string,
): Promise<ReplyResult | null> {
  const generator = getReplyGenerator();
  if (!generator) return null;

  return generator.generate(
    replySystemPrompt(),
    history.slice(-HISTORY_TURNS),
    incoming,
  );
}
