import { describe, it, expect } from "vitest";
import {
  applyDisplayName,
  bareAddress,
  quoteDisplayName,
  replyToAddress,
} from "@/lib/email/sender";

const CONFIGURED = "Aliamz Digital <bookings@aliamz.com>";

describe("bareAddress", () => {
  it("strips an existing display name", () => {
    expect(bareAddress(CONFIGURED)).toBe("bookings@aliamz.com");
  });

  it("accepts a plain address", () => {
    expect(bareAddress("bookings@aliamz.com")).toBe("bookings@aliamz.com");
    expect(bareAddress("  bookings@aliamz.com  ")).toBe("bookings@aliamz.com");
  });
});

describe("applyDisplayName", () => {
  it("puts the tenant's name on the platform address", () => {
    expect(applyDisplayName(CONFIGURED, "Ronie's Barber")).toBe(
      `"Ronie's Barber" <bookings@aliamz.com>`,
    );
  });

  it("keeps every tenant on the one verified domain", () => {
    // The whole point of taking a NAME rather than a From header: the domain
    // is not something a caller — or a business name — can influence.
    //
    // A hostile name may still CONTAIN "<ceo@bank.example>" in the output, and
    // that is fine: it sits inside the quoted display name, where angle
    // brackets are literal text. What must hold is that the real address — the
    // angle-addr after the quoted string — is always ours, and that nothing
    // unquoted precedes it that a parser could read as an address instead.
    for (const name of [
      "Ronie's Barber",
      "Evil <ceo@bank.example>, Real",
      "x@attacker.example",
      'closer" <x@attacker.example>, y',
    ]) {
      const out = applyDisplayName(CONFIGURED, name);
      expect(out.endsWith(" <bookings@aliamz.com>")).toBe(true);

      const display = out.slice(0, -" <bookings@aliamz.com>".length);
      expect(display.startsWith('"')).toBe(true);
      expect(display.endsWith('"')).toBe(true);
      // No unescaped quote can close the display name early and let the rest
      // of it be parsed as address syntax.
      expect(display.slice(1, -1).replace(/\\./g, "")).not.toContain('"');
    }
  });

  it("falls back to the configured From when there is no usable name", () => {
    expect(applyDisplayName(CONFIGURED, undefined)).toBe(CONFIGURED);
    expect(applyDisplayName(CONFIGURED, "")).toBe(CONFIGURED);
    expect(applyDisplayName(CONFIGURED, "   ")).toBe(CONFIGURED);
  });
});

describe("quoteDisplayName", () => {
  it("cannot inject a second address", () => {
    // Unquoted, this would parse as TWO From addresses and the first one wins.
    const out = quoteDisplayName("Evil <ceo@bank.example>, Real");
    expect(out).toBe(`"Evil <ceo@bank.example>, Real"`);
    // One quoted string: the angle brackets are literal text, not delimiters.
    expect(out!.startsWith('"')).toBe(true);
    expect(out!.endsWith('"')).toBe(true);
  });

  it("cannot split the header with CR or LF", () => {
    const out = quoteDisplayName("Ronie\r\nBcc: victim@example.com");
    expect(out).not.toMatch(/[\r\n]/);
    expect(out).toBe(`"Ronie Bcc: victim@example.com"`);
  });

  it("escapes quotes and backslashes so the quoting can't be closed early", () => {
    expect(quoteDisplayName('Ron"ie')).toBe(`"Ron\\"ie"`);
    expect(quoteDisplayName("Ron\\ie")).toBe(`"Ron\\\\ie"`);
    // The nasty one: a trailing backslash would otherwise escape the closing
    // quote and swallow the address.
    expect(quoteDisplayName("Ronie\\")).toBe(`"Ronie\\\\"`);
  });

  it("handles names that would need quoting anyway", () => {
    // A bare period in an unquoted display name is a syntax error.
    expect(quoteDisplayName("Ronies Barber Co.")).toBe(`"Ronies Barber Co."`);
  });

  it("keeps non-Latin business names", () => {
    expect(quoteDisplayName("理髪店")).toBe(`"理髪店"`);
  });

  it("collapses whitespace and caps the length", () => {
    expect(quoteDisplayName("  Ronie's   Barber  ")).toBe(`"Ronie's Barber"`);
    const long = quoteDisplayName("A".repeat(200))!;
    expect(long.length).toBe(80); // 78 chars + the two quotes
  });

  it("returns null when nothing usable survives", () => {
    expect(quoteDisplayName("")).toBeNull();
    expect(quoteDisplayName("   ")).toBeNull();
    expect(quoteDisplayName("\r\n\t")).toBeNull();
  });
});

describe("replyToAddress", () => {
  it("passes a plain address through", () => {
    expect(replyToAddress("juan@example.com")).toBe("juan@example.com");
    expect(replyToAddress("  juan.dela-cruz+tag@sub.example.co.uk  ")).toBe(
      "juan.dela-cruz+tag@sub.example.co.uk",
    );
  });

  it("is null when there is nothing to set", () => {
    expect(replyToAddress(undefined)).toBeNull();
    expect(replyToAddress("")).toBeNull();
    expect(replyToAddress("   ")).toBeNull();
  });

  /*
   * This value arrives from a public form and goes into a mail header, so the
   * three things it must not be able to do are carry a display name, smuggle a
   * second recipient, or split the header. Refusing anything that is not one
   * bare address closes all three at once.
   */
  it("refuses a display name or angle-addr form", () => {
    expect(replyToAddress("Evil <ceo@bank.example>")).toBeNull();
    expect(replyToAddress("<juan@example.com>")).toBeNull();
    expect(replyToAddress('"Juan" juan@example.com')).toBeNull();
  });

  it("refuses a second recipient", () => {
    expect(replyToAddress("a@example.com, b@example.com")).toBeNull();
    expect(replyToAddress("a@example.com; b@example.com")).toBeNull();
  });

  it("refuses header injection, including via control characters", () => {
    for (const raw of [
      "a@example.com\nBcc: victim@example.com",
      "a@example.com\r\nSubject: spam",
      "a@example.com\u0000",
      "a@exam\u001fple.com",
    ]) {
      const result = replyToAddress(raw);
      // Either rejected outright, or stripped back to a single clean address —
      // never a value still carrying the injected header.
      expect(result === null || /^[^\s]+@[^\s]+$/.test(result)).toBe(true);
      expect(result ?? "").not.toMatch(/bcc|subject/i);
    }
  });

  it("refuses something that is not an address at all", () => {
    expect(replyToAddress("not-an-address")).toBeNull();
    expect(replyToAddress("missing@tld")).toBeNull();
    expect(replyToAddress("@example.com")).toBeNull();
  });

  it("refuses an absurdly long value", () => {
    expect(replyToAddress(`${"a".repeat(250)}@example.com`)).toBeNull();
  });
});
