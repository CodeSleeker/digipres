/**
 * The reply port.
 *
 * Same shape as the SMS generator port (lib/ai/types.ts) and for the same
 * reason: the webhook depends on this interface, not on a provider, so swapping
 * Anthropic for OpenAI is a configuration change rather than a rewrite.
 *
 * `generate` returns null for every unusable outcome — a refusal, a truncation,
 * a rate limit, a bad key. The caller treats them identically: stay silent and
 * leave the thread to a human. Answering anyway is the failure this whole
 * design exists to avoid, so there is deliberately no way to signal "I failed,
 * send something generic".
 */

/** One prior turn, oldest first. */
export interface ReplyTurn {
  role: "customer" | "assistant";
  text: string;
}

export interface ReplyResult {
  text: string;
  model: string;
  latencyMs: number;
  /** Total tokens billed, for the per-conversation cost cap in a later phase. */
  tokens: number;
}

export interface ReplyGenerator {
  readonly provider: "anthropic" | "openai";
  /**
   * @param system The grounding pack and rules — identical on every turn, so a
   *   provider that supports prompt caching can cache it.
   * @param history Prior turns, oldest first, excluding `incoming`.
   */
  generate(
    system: string,
    history: ReplyTurn[],
    incoming: string,
  ): Promise<ReplyResult | null>;
}
