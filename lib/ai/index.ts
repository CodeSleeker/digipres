import type { SmsGenerator } from "./types";
import { TemplateGenerator } from "./template-generator";
import { OpenAIGenerator } from "./openai-generator";
import { AnthropicGenerator } from "./anthropic-generator";

/**
 * Choose the SMS generator. AI is OPT-IN, per feature.
 *
 *   AI_SMS_PROVIDER = openai | anthropic  → that provider, if its key is set
 *   AI_SMS_PROVIDER unset / anything else → the deterministic template writer
 *
 * WHY NOT AUTO-DETECT FROM THE KEYS.
 *
 * This used to fall back to "whichever API key happens to exist", which quietly
 * coupled two unrelated features: setting ANTHROPIC_API_KEY so the Messenger bot
 * could reply ALSO switched SMS from templates to generated text, on a channel
 * that costs money per message and goes to customers under the business's own
 * sender ID. Nobody asked for that, and nothing announced it.
 *
 * A key is a credential, not a decision. Each feature that spends money or
 * speaks to customers gets its own switch, so turning one on can never turn
 * another on as a side effect.
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

  // Unset, "template", or a typo — all mean the same thing, and all fail toward
  // the deterministic writer rather than toward spending money.
  return new TemplateGenerator();
}

export { TemplateGenerator };
