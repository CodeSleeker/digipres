import type { SmsGenerator, SmsGenInput } from "./types";
import { firstName } from "./prompt";

/**
 * Deterministic fallback used when no AI provider/key is configured. Every
 * template already satisfies the guardrails (owner name present, ≤320 chars,
 * non-spammy), so its output passes validation unchanged. English only — real
 * language support needs an AI provider.
 */
export class TemplateGenerator implements SmsGenerator {
  readonly provider = "template";

  async generate(input: SmsGenInput): Promise<string[]> {
    const owner = firstName(input.ownerName);
    const customer = firstName(input.customerName);
    const shop = input.businessName;
    const svc = input.service ? ` after your ${input.service}` : "";

    const templates = [
      `Hi ${customer}, ${owner} here from ${shop}. Thank you for visiting${svc} — it was a pleasure having you. We hope to see you again soon.`,
      `Hi ${customer}, it's ${owner} from ${shop}. Thanks so much for coming in${svc}. If there's anything we could do better, just let us know.`,
      `Hello ${customer}, ${owner} from ${shop} here. We really appreciated having you${svc} and look forward to welcoming you back.`,
      `Hi ${customer}, ${owner} from ${shop}. Thanks for choosing us${svc} — take care, and see you next time.`,
      `Hi ${customer}, ${owner} here at ${shop}. Grateful you stopped by${svc}. Wishing you a wonderful day.`,
    ];

    return templates.slice(0, Math.max(1, input.count));
  }
}
