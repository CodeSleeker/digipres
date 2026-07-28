import OpenAI from "openai";
import type { SmsGenerator, SmsGenInput } from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { parseVariations } from "./validate";

/** OpenAI adapter. Model is env-configurable (OPENAI_MODEL), default gpt-4o-mini. */
export class OpenAIGenerator implements SmsGenerator {
  readonly provider = "openai";

  async generate(input: SmsGenInput): Promise<string[]> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.9, // variety across the variations
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(input) },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    return parseVariations(completion.choices[0]?.message?.content ?? "");
  }
}
