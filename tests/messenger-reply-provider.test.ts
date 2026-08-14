import { describe, expect, it } from "vitest";
import { getReplyGenerator, replySystemPrompt } from "@/lib/messenger/reply";

/**
 * Provider selection for the Messenger bot.
 *
 * Same rule as AI SMS, for the same reason: a key present for one feature must
 * never switch on another that spends money and speaks to customers. Unset
 * means the bot stores messages and stays silent.
 */
describe("getReplyGenerator", () => {
  it("is silent when no provider is named", () => {
    expect(getReplyGenerator({})).toBeNull();
    expect(
      getReplyGenerator({
        ANTHROPIC_API_KEY: "sk-ant-test",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toBeNull();
  });

  it("selects OpenAI when named and keyed", () => {
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "openai",
        OPENAI_API_KEY: "sk-test",
      })?.provider,
    ).toBe("openai");
  });

  it("selects Anthropic when named and keyed", () => {
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "sk-ant-test",
      })?.provider,
    ).toBe("anthropic");
  });

  /** Naming one provider must never fall through to the other's key. */
  it("stays silent when the named provider has no key", () => {
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "openai",
        ANTHROPIC_API_KEY: "sk-ant-test",
      }),
    ).toBeNull();
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "anthropic",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toBeNull();
  });

  it("prefers the feature's own key over the shared one", () => {
    // Both present: the per-feature key wins, so the bot can be revoked alone.
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "openai",
        MESSENGER_OPENAI_API_KEY: "sk-messenger",
        OPENAI_API_KEY: "sk-shared",
      })?.provider,
    ).toBe("openai");
    // Only the per-feature key: still works, no shared key needed.
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "anthropic",
        MESSENGER_ANTHROPIC_API_KEY: "sk-messenger",
      })?.provider,
    ).toBe("anthropic");
  });

  it("treats a typo as off rather than guessing", () => {
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "opennai",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toBeNull();
  });

  it("ignores case and surrounding whitespace", () => {
    expect(
      getReplyGenerator({
        MESSENGER_AI_PROVIDER: "  OpenAI ",
        OPENAI_API_KEY: "sk-test",
      })?.provider,
    ).toBe("openai");
  });
});

/**
 * Both providers are handed the same system prompt by the dispatcher, so
 * neither can quietly ground itself differently.
 */
describe("replySystemPrompt", () => {
  it("carries both the rules and the facts", () => {
    const prompt = replySystemPrompt();
    expect(prompt).toMatch(/ONLY from the facts/i);
    expect(prompt).toContain("CUSTOM SOFTWARE SERVICES");
    expect(prompt).toContain("NOT KNOWN");
  });
});
