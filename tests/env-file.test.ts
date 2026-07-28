import { describe, it, expect } from "vitest";
// Plain .mjs module shared by the operator scripts (seed) — tested here so the
// bootstrap path is covered like everything else.
import { parseEnvFile } from "../scripts/env-file.mjs";

describe("env file parser (operator scripts)", () => {
  it("parses simple KEY=value pairs", () => {
    expect(parseEnvFile("A=1\nB=two")).toEqual({ A: "1", B: "two" });
  });

  it("ignores comments and blank lines", () => {
    expect(parseEnvFile("# note\n\nA=1\n  # more\nB=2")).toEqual({
      A: "1",
      B: "2",
    });
  });

  it("keeps empty values as empty strings (they mean 'unset feature')", () => {
    expect(parseEnvFile("NEXT_PUBLIC_ROOT_DOMAIN=")).toEqual({
      NEXT_PUBLIC_ROOT_DOMAIN: "",
    });
  });

  it("strips matching quotes but keeps inner content verbatim", () => {
    expect(parseEnvFile(`A="hello world"\nB='x=y'`)).toEqual({
      A: "hello world",
      B: "x=y",
    });
  });

  it("drops trailing comments on unquoted values only", () => {
    expect(parseEnvFile('A=value # note\nB="kept # inside"')).toEqual({
      A: "value",
      B: "kept # inside",
    });
  });

  it("handles export prefixes and CRLF line endings", () => {
    expect(parseEnvFile("export A=1\r\nB=2\r\n")).toEqual({ A: "1", B: "2" });
  });

  it("takes the last assignment when a key repeats", () => {
    expect(parseEnvFile("A=first\nA=second").A).toBe("second");
  });
});
