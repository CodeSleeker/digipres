import { describe, it, expect } from "vitest";
import {
  bookingSoundEnabled,
  setBookingSoundEnabled,
} from "@/lib/notifications/chime";

/** Minimal stand-in for localStorage — these tests run without a DOM. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    read: (key: string) => data.get(key) ?? null,
  };
}

const KEY = "admin:booking-sound";

describe("booking sound preference", () => {
  it("defaults to ON for a first visit", () => {
    // An alert nobody hears isn't an alert. Opt-out, not opt-in.
    expect(bookingSoundEnabled(fakeStorage())).toBe(true);
  });

  it("stays on unless explicitly turned off", () => {
    expect(bookingSoundEnabled(fakeStorage({ [KEY]: "on" }))).toBe(true);
    expect(bookingSoundEnabled(fakeStorage({ [KEY]: "off" }))).toBe(false);
  });

  it("treats an unrecognised stored value as on rather than silent", () => {
    // Only the exact string "off" mutes. Anything else — a stale value from an
    // older build, or storage corruption — must not silently kill the alert.
    expect(bookingSoundEnabled(fakeStorage({ [KEY]: "" }))).toBe(true);
    expect(bookingSoundEnabled(fakeStorage({ [KEY]: "true" }))).toBe(true);
  });

  it("defaults to on when storage is unavailable", () => {
    // Blocked cookies / private mode: the switch is gone, the sound stays.
    expect(bookingSoundEnabled(null)).toBe(true);
  });

  it("round-trips through the store", () => {
    const storage = fakeStorage();
    setBookingSoundEnabled(false, storage);
    expect(storage.read(KEY)).toBe("off");
    expect(bookingSoundEnabled(storage)).toBe(false);

    setBookingSoundEnabled(true, storage);
    expect(storage.read(KEY)).toBe("on");
    expect(bookingSoundEnabled(storage)).toBe(true);
  });

  it("does nothing and does not throw when storage is null", () => {
    expect(() => setBookingSoundEnabled(false, null)).not.toThrow();
  });
});
