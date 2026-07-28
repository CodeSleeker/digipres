import { describe, it, expect } from "vitest";
import { normalizeHostname } from "@/repositories/domain-repository";

describe("normalizeHostname", () => {
  it("lowercases and trims", () => {
    expect(normalizeHostname("  RoniesBarber.COM ")).toBe("roniesbarber.com");
  });

  it("strips scheme, path, port and trailing dot", () => {
    expect(normalizeHostname("https://roniesbarber.com/book")).toBe(
      "roniesbarber.com",
    );
    expect(normalizeHostname("http://localhost:3000")).toBe("localhost");
    expect(normalizeHostname("roniesbarber.com.")).toBe("roniesbarber.com");
  });

  it("keeps www and subdomains distinct (separate rows point to one business)", () => {
    expect(normalizeHostname("WWW.roniesbarber.com")).toBe(
      "www.roniesbarber.com",
    );
    expect(normalizeHostname("ronies.platform.com")).toBe(
      "ronies.platform.com",
    );
  });
});
