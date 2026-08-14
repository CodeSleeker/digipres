import Anthropic from "@anthropic-ai/sdk";
import { logError } from "@/lib/observability/logger";
import type { ReplyGenerator, ReplyResult, ReplyTurn } from "./reply-types";

/**
 * Anthropic adapter.
 *
 * `low` effort by default: this is a latency-sensitive conversational turn
 * answering from a fixed context pack — someone is watching a typing indicator,
 * and the work is retrieval-shaped rather than reasoning-shaped. Both model and
 * effort are env-overridable so the tradeoff can be re-tuned without a deploy.
 */
export class AnthropicReplyGenerator implements ReplyGenerator {
  readonly provider = "anthropic" as const;

  constructor(private readonly apiKey: string) {}

  async generate(
    system: string,
    history: ReplyTurn[],
    incoming: string,
  ): Promise<ReplyResult | null> {
    const started = Date.now();
    const model = process.env.MESSENGER_MODEL?.trim() || "claude-opus-5";
    const effort = (process.env.MESSENGER_EFFORT?.trim() || "low") as
      | "low"
      | "medium"
      | "high";

    try {
      const client = new Anthropic({ apiKey: this.apiKey });

      const response = await client.messages.create({
        model,
        /* Generous relative to the reply, because `max_tokens` caps thinking AND
           text together on this model. A Messenger message is at most 2000
           characters, so this is almost entirely headroom for thinking — sizing
           it to the reply is how a response gets truncated mid-sentence. */
        max_tokens: 4096,
        output_config: { effort },
        system: [
          {
            type: "text",
            text: system,
            /* Identical every turn and ahead of the transcript, so it caches
               cleanly; the volatile part is after this breakpoint. */
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          ...history.map((turn) => ({
            role:
              turn.role === "customer" ? ("user" as const) : ("assistant" as const),
            content: turn.text,
          })),
          { role: "user" as const, content: incoming },
        ],
      });

      /*
       * Refusals are a normal 200, with `content` empty or partial — reading
       * content[0] before checking this is the documented way to crash on one.
       */
      if (response.stop_reason === "refusal") {
        logError(new Error("Model declined to answer"), {
          scope: "messenger:reply:refusal",
          category: response.stop_details?.category ?? null,
        });
        return null;
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();
      if (!text) return null;

      return {
        text,
        model: response.model,
        latencyMs: Date.now() - started,
        tokens:
          response.usage.input_tokens +
          response.usage.output_tokens +
          (response.usage.cache_read_input_tokens ?? 0) +
          (response.usage.cache_creation_input_tokens ?? 0),
      };
    } catch (error) {
      logError(error, { scope: "messenger:reply:anthropic" });
      return null;
    }
  }
}
