import type { SmsGenerator } from "./types";
import { TemplateGenerator } from "./template-generator";
import { OpenAIGenerator } from "./openai-generator";
import { AnthropicGenerator } from "./anthropic-generator";

/**
 * Choose the SMS generator from env:
 *   AI_SMS_PROVIDER = openai | anthropic  → use it if its API key is present
 *   (unset)                               → auto-detect from whichever key exists
 *   no provider/key                       → the deterministic template fallback
 */
export function getSmsGenerator(): SmsGenerator {
  const provider = (process.env.AI_SMS_PROVIDER || "").trim().toLowerCase();

  if (provider === "openai") {
    return process.env.OPENAI_API_KEY
      ? new OpenAIGenerator()
      : new TemplateGenerator();
  }
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_API_KEY
      ? new AnthropicGenerator()
      : new TemplateGenerator();
  }

  // No explicit default — use whichever provider is configured.
  if (process.env.OPENAI_API_KEY) return new OpenAIGenerator();
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicGenerator();

  return new TemplateGenerator();
}

export { TemplateGenerator };
