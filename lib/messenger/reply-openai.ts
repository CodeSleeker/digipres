import OpenAI from "openai";
import { logError } from "@/lib/observability/logger";
import type { ReplyGenerator, ReplyResult, ReplyTurn } from "./reply-types";

/**
 * OpenAI adapter.
 *
 * A low temperature, unlike the AI SMS generator's 0.9. That one wants variety
 * across several drafts an owner picks from; this one must answer faithfully
 * from a fixed fact sheet, where invention is the failure mode. Creativity here
 * is indistinguishable from making things up.
 */
export class OpenAIReplyGenerator implements ReplyGenerator {
  readonly provider = "openai" as const;

  constructor(private readonly apiKey: string) {}

  async generate(
    system: string,
    history: ReplyTurn[],
    incoming: string,
  ): Promise<ReplyResult | null> {
    const started = Date.now();
    const model =
      process.env.MESSENGER_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4o-mini";

    try {
      const client = new OpenAI({ apiKey: this.apiKey });

      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        // A Messenger message caps at 2000 characters; this is the reply only,
        // with no hidden reasoning sharing the budget.
        max_tokens: 600,
        messages: [
          { role: "system", content: system },
          ...history.map((turn) => ({
            role:
              turn.role === "customer" ? ("user" as const) : ("assistant" as const),
            content: turn.text,
          })),
          { role: "user" as const, content: incoming },
        ],
      });

      const choice = completion.choices[0];

      /*
       * `length` means the model was cut off mid-sentence. Sending a truncated
       * half-answer to a customer is worse than sending nothing and letting a
       * human pick it up, which is what returning null does.
       */
      if (choice?.finish_reason === "length") {
        logError(new Error("Reply truncated at max_tokens"), {
          scope: "messenger:reply:truncated",
          model,
        });
        return null;
      }

      const text = choice?.message?.content?.trim();
      if (!text) return null;

      return {
        text,
        model: completion.model,
        latencyMs: Date.now() - started,
        tokens: completion.usage?.total_tokens ?? 0,
      };
    } catch (error) {
      logError(error, { scope: "messenger:reply:openai" });
      return null;
    }
  }
}
