import { describe, expect, it } from "vitest";
import {
  PLATFORM_SYSTEM_RULES,
  platformContextPack,
} from "@/lib/messenger/grounding";
import { CONTACT, SERVICES, CAPABILITIES } from "@/lib/marketing/content";
import { typingDelayFor, MESSENGER_MAX_CHARS } from "@/lib/messenger/send";

describe("platformContextPack", () => {
  const pack = platformContextPack();

  /**
   * The pack is assembled from the same constants the marketing page renders,
   * so the bot cannot describe a service the site doesn't list. A second copy
   * of this content is the failure this test exists to prevent.
   */
  it("carries every service the website lists", () => {
    for (const service of SERVICES) {
      expect(pack).toContain(service.title);
    }
  });

  it("carries every platform capability the website lists", () => {
    for (const capability of CAPABILITIES) {
      expect(pack).toContain(capability.title);
    }
  });

  it("carries the real contact details", () => {
    expect(pack).toContain(CONTACT.email);
    expect(pack).toContain(CONTACT.phone);
  });

  /**
   * The absent facts are load-bearing. The model is told to answer only from
   * this block, so naming what is NOT here is what converts "don't invent a
   * price" from a hope into a rule with something to point at.
   */
  it("names what it must decline rather than guess", () => {
    expect(pack).toContain("NOT KNOWN");
    for (const forbidden of ["prices", "timelines", "availability"]) {
      expect(pack.toLowerCase()).toContain(forbidden);
    }
  });

  it("states no price anywhere", () => {
    // Any currency figure in the pack would be a fact the model may quote.
    expect(pack).not.toMatch(/[₱$€£]\s?\d/);
    expect(pack).not.toMatch(/\b\d+\s?(?:php|usd)\b/i);
  });
});

describe("PLATFORM_SYSTEM_RULES", () => {
  it("forbids inventing an answer", () => {
    expect(PLATFORM_SYSTEM_RULES).toMatch(/ONLY from the facts/i);
    expect(PLATFORM_SYSTEM_RULES).toMatch(/Never guess/i);
  });

  it("forbids quoting a price or a date", () => {
    expect(PLATFORM_SYSTEM_RULES).toMatch(/price|quote|timeline/i);
  });

  /** Meta's platform policy, and several jurisdictions, require disclosure. */
  it("requires the bot to admit it is an assistant", () => {
    expect(PLATFORM_SYSTEM_RULES).toMatch(/assistant/i);
    expect(PLATFORM_SYSTEM_RULES).toMatch(/Never claim to be a named person/i);
  });

  it("constrains replies to chat length, not document length", () => {
    expect(PLATFORM_SYSTEM_RULES).toMatch(/short sentences/i);
    expect(PLATFORM_SYSTEM_RULES).toMatch(/No bullet lists/i);
  });
});

describe("typingDelayFor", () => {
  /**
   * The indicator has to be visible without being a wait. An uncapped delay
   * proportional to length leaves someone watching dots after a long answer.
   */
  it("is floored so the indicator is visible at all", () => {
    expect(typingDelayFor("ok")).toBeGreaterThanOrEqual(600);
  });

  it("is capped so a long reply doesn't stall", () => {
    expect(typingDelayFor("x".repeat(MESSENGER_MAX_CHARS))).toBeLessThanOrEqual(
      4000,
    );
  });

  it("grows with the length of the reply", () => {
    expect(typingDelayFor("x".repeat(120))).toBeGreaterThan(
      typingDelayFor("x".repeat(30)),
    );
  });
});
