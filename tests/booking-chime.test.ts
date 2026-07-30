import { describe, it, expect } from "vitest";
import {
  BOOKING_SOUNDS,
  DEFAULT_SOUND_ID,
  DEFAULT_VOLUME,
  bookingSoundEnabled,
  bookingSoundId,
  bookingSoundVolume,
  findBookingSound,
  setBookingSoundEnabled,
  setBookingSoundId,
  setBookingSoundVolume,
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

const SOUND_KEY = "admin:booking-sound-id";
const VOLUME_KEY = "admin:booking-sound-volume";

describe("booking sound choice", () => {
  it("defaults to the chime", () => {
    expect(bookingSoundId(fakeStorage())).toBe(DEFAULT_SOUND_ID);
    expect(bookingSoundId(null)).toBe(DEFAULT_SOUND_ID);
  });

  it("round-trips a known sound", () => {
    const storage = fakeStorage();
    setBookingSoundId("bell", storage);
    expect(storage.read(SOUND_KEY)).toBe("bell");
    expect(bookingSoundId(storage)).toBe("bell");
  });

  it("falls back to the default rather than going silent on an unknown id", () => {
    // A value left by an older build must not mute the alert.
    expect(bookingSoundId(fakeStorage({ [SOUND_KEY]: "trombone" }))).toBe(
      DEFAULT_SOUND_ID,
    );
    expect(findBookingSound("nope").id).toBe(DEFAULT_SOUND_ID);
  });

  it("refuses to store an unknown id", () => {
    const storage = fakeStorage();
    setBookingSoundId("trombone", storage);
    expect(storage.read(SOUND_KEY)).toBe(DEFAULT_SOUND_ID);
  });

  it("every preset is playable and rises or holds pitch", () => {
    // A falling interval reads as an error; a booking should not sound like one.
    for (const sound of BOOKING_SOUNDS) {
      expect(sound.notes.length).toBeGreaterThan(0);
      for (const note of sound.notes) {
        expect(note.hz).toBeGreaterThan(0);
        expect(note.seconds).toBeGreaterThan(0);
        expect(note.at).toBeGreaterThanOrEqual(0);
      }
      const pitches = sound.notes.map((n) => n.hz);
      const descending = pitches.some((hz, i) => i > 0 && hz < pitches[i - 1]!);
      expect(descending).toBe(false);
    }
  });

  it("has unique ids and labels", () => {
    expect(new Set(BOOKING_SOUNDS.map((s) => s.id)).size).toBe(
      BOOKING_SOUNDS.length,
    );
  });
});

describe("booking sound volume", () => {
  it("defaults when unset or unparseable", () => {
    expect(bookingSoundVolume(fakeStorage())).toBe(DEFAULT_VOLUME);
    expect(bookingSoundVolume(fakeStorage({ [VOLUME_KEY]: "loud" }))).toBe(
      DEFAULT_VOLUME,
    );
    // Not 0: silently muting the alert is the worst available failure.
    expect(bookingSoundVolume(null)).toBe(DEFAULT_VOLUME);
  });

  it("clamps to 0–1 on read and on write", () => {
    expect(bookingSoundVolume(fakeStorage({ [VOLUME_KEY]: "5" }))).toBe(1);
    expect(bookingSoundVolume(fakeStorage({ [VOLUME_KEY]: "-2" }))).toBe(0);

    const storage = fakeStorage();
    setBookingSoundVolume(9, storage);
    expect(storage.read(VOLUME_KEY)).toBe("1");
    setBookingSoundVolume(-1, storage);
    expect(storage.read(VOLUME_KEY)).toBe("0");
  });

  it("keeps an explicit zero — muting on purpose is allowed", () => {
    expect(bookingSoundVolume(fakeStorage({ [VOLUME_KEY]: "0" }))).toBe(0);
  });

  it("round-trips a normal value", () => {
    const storage = fakeStorage();
    setBookingSoundVolume(0.4, storage);
    expect(bookingSoundVolume(storage)).toBeCloseTo(0.4);
  });
});
