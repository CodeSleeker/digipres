import { afterEach, describe, expect, it } from "vitest";
import { getSmsGenerator } from "@/lib/ai";

/**
 * AI is opt-in per feature.
 *
 * The regression these guard against is a real one: setting ANTHROPIC_API_KEY so
 * the Messenger bot could reply also switched SMS from templates to generated
 * text — a paid channel going to customers — with nothing announcing the change.
 * A key is a credential, not a decision.
 */

const KEYS = [
  "AI_SMS_PROVIDER",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
] as const;

const original = Object.fromEntries(
  KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof KEYS)[number], string | undefined>;

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function withEnv(env: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  return getSmsGenerator().provider;
}

describe("SMS generator selection", () => {
  it("uses templates when nothing is configured", () => {
    expect(withEnv({})).toBe("template");
  });

  /** The coupling bug: a key present for another feature must not enable this one. */
  it("stays on templates when only an API key is present", () => {
    expect(withEnv({ ANTHROPIC_API_KEY: "sk-ant-test" })).toBe("template");
    expect(withEnv({ OPENAI_API_KEY: "sk-test" })).toBe("template");
    expect(
      withEnv({ ANTHROPIC_API_KEY: "sk-ant-test", OPENAI_API_KEY: "sk-test" }),
    ).toBe("template");
  });

  it("uses a provider only when it is named AND keyed", () => {
    expect(
      withEnv({ AI_SMS_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-test" }),
    ).toBe("anthropic");
    expect(
      withEnv({ AI_SMS_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" }),
    ).toBe("openai");
  });

  it("falls back to templates when the named provider has no key", () => {
    expect(withEnv({ AI_SMS_PROVIDER: "anthropic" })).toBe("template");
    // Named one provider, keyed the other — still templates, not the keyed one.
    expect(
      withEnv({ AI_SMS_PROVIDER: "anthropic", OPENAI_API_KEY: "sk-test" }),
    ).toBe("template");
  });

  it("treats a typo as off rather than guessing", () => {
    expect(
      withEnv({ AI_SMS_PROVIDER: "anthropci", ANTHROPIC_API_KEY: "sk-ant-test" }),
    ).toBe("template");
  });

  it("accepts an explicit template setting", () => {
    expect(
      withEnv({ AI_SMS_PROVIDER: "template", ANTHROPIC_API_KEY: "sk-ant-test" }),
    ).toBe("template");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(
      withEnv({ AI_SMS_PROVIDER: "  Anthropic ", ANTHROPIC_API_KEY: "sk-ant-test" }),
    ).toBe("anthropic");
  });
});
