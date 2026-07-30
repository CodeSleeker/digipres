import { describe, it, expect } from "vitest";
import {
  applyDisplayName,
  bareAddress,
  quoteDisplayName,
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
