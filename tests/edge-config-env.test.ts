import { describe, it, expect } from "vitest";
import {
  edgeConfigConnection,
  edgeConfigStoreId,
} from "@/lib/tenant/edge-routing";

/**
 * Vercel renamed Edge Config to Global Config in July 2026. Connecting a store
 * now injects GLOBAL_CONFIG; stores connected before then still supply
 * EDGE_CONFIG. Both must resolve, because a missing connection string doesn't
 * fail loudly — it falls back to the database and looks perfectly healthy.
 */
const CONNECTION = "https://edge-config.vercel.com/ecfg_abc123?token=secret";

describe("edgeConfigConnection", () => {
  it("reads the current variable", () => {
    expect(edgeConfigConnection({ GLOBAL_CONFIG: CONNECTION })).toBe(CONNECTION);
  });

  it("still reads the legacy variable", () => {
    expect(edgeConfigConnection({ EDGE_CONFIG: CONNECTION })).toBe(CONNECTION);
  });

  it("prefers the current variable when both are set", () => {
    expect(
      edgeConfigConnection({
        GLOBAL_CONFIG: CONNECTION,
        EDGE_CONFIG: "https://edge-config.vercel.com/ecfg_old?token=x",
      }),
    ).toBe(CONNECTION);
  });

  it("treats blank as unset", () => {
    expect(edgeConfigConnection({})).toBeUndefined();
    expect(edgeConfigConnection({ GLOBAL_CONFIG: "   " })).toBeUndefined();
  });
});

describe("edgeConfigStoreId", () => {
  it("derives the id from the connection string", () => {
    // Vercel injects only the connection string, never an id — deriving it is
    // what stops the write path needing a second, hand-copied variable.
    expect(edgeConfigStoreId({ GLOBAL_CONFIG: CONNECTION })).toBe("ecfg_abc123");
    expect(edgeConfigStoreId({ EDGE_CONFIG: CONNECTION })).toBe("ecfg_abc123");
  });

  it("lets an explicit id win, under either name", () => {
    expect(
      edgeConfigStoreId({ GLOBAL_CONFIG: CONNECTION, GLOBAL_CONFIG_ID: "ecfg_x" }),
    ).toBe("ecfg_x");
    expect(
      edgeConfigStoreId({ GLOBAL_CONFIG: CONNECTION, EDGE_CONFIG_ID: "ecfg_y" }),
    ).toBe("ecfg_y");
  });

  it("returns undefined rather than a wrong id when there is nothing to read", () => {
    // The caller no-ops on undefined. Guessing here would mean PATCHing a store
    // that isn't ours.
    expect(edgeConfigStoreId({})).toBeUndefined();
    expect(edgeConfigStoreId({ GLOBAL_CONFIG: "not-a-url" })).toBeUndefined();
    expect(
      edgeConfigStoreId({ GLOBAL_CONFIG: "https://edge-config.vercel.com/" }),
    ).toBeUndefined();
  });

  it("survives a connection string with extra path segments", () => {
    expect(
      edgeConfigStoreId({
        GLOBAL_CONFIG: "https://edge-config.vercel.com/v1/ecfg_zzz?token=t",
      }),
    ).toBe("ecfg_zzz");
  });
});
