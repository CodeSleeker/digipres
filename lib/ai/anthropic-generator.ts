import Anthropic from "@anthropic-ai/sdk";
import type { SmsGenerator, SmsGenInput } from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { parseVariations } from "./validate";

/**
 * Anthropic (Claude) adapter. Model is env-configurable (ANTHROPIC_MODEL),
 * default claude-opus-4-8.
 *
 * Note: `temperature` and `thinking.budget_tokens` are intentionally omitted —
 * they are rejected (HTTP 400) on Opus 4.8 / 4.7. Variety comes from the prompt.
 */
export class AnthropicGenerator implements SmsGenerator {
  readonly provider = "anthropic";

  async generate(input: SmsGenInput): Promise<string[]> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: buildSystemPrompt(input),
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return parseVariations(text);
  }
}
