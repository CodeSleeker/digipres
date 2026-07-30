/**
 * The sound a new booking makes in the dashboard.
 *
 * Every option is SYNTHESISED with the Web Audio API rather than played from a
 * file: no binary assets to commit, nothing to fetch, nothing for the CSP's
 * `media-src` to consider, and adding a new option costs a few numbers rather
 * than another download.
 */

const ENABLED_KEY = "admin:booking-sound";
const SOUND_KEY = "admin:booking-sound-id";
const VOLUME_KEY = "admin:booking-sound-volume";

/** A burst of bookings shouldn't turn into a burst of chimes. */
const MIN_GAP_MS = 2000;

/** Ceiling for a single note. Alert, not alarm — the volume scales this. */
const PEAK_GAIN = 0.16;

export const DEFAULT_SOUND_ID = "chime";
export const DEFAULT_VOLUME = 0.7;

interface Note {
  hz: number;
  /** Seconds from the start of the sound. */
  at: number;
  /** How long it rings. */
  seconds: number;
  /** Triangle carries better over room noise; sine is softer and rounder. */
  type?: OscillatorType;
  /** Relative loudness, for harmonics that should sit under the main note. */
  gain?: number;
}

export interface BookingSound {
  id: string;
  label: string;
  notes: Note[];
}

/**
 * Rising intervals read as "something arrived"; falling ones read as an error,
 * which is the wrong feeling for a booking. All of these rise or stay level.
 */
export const BOOKING_SOUNDS: BookingSound[] = [
  {
    id: "chime",
    label: "Chime",
    notes: [
      { hz: 880, at: 0, seconds: 0.18 },
      { hz: 1174.66, at: 0.18, seconds: 0.18 },
    ],
  },
  {
    id: "bell",
    label: "Bell",
    notes: [
      { hz: 1568, at: 0, seconds: 0.65, type: "sine" },
      // A quiet harmonic on top is what stops a plain sine sounding like a test
      // tone. It decays faster than the fundamental, as a real bell does.
      { hz: 2349, at: 0, seconds: 0.3, type: "sine", gain: 0.35 },
    ],
  },
  {
    id: "ping",
    label: "Ping",
    notes: [{ hz: 1046.5, at: 0, seconds: 0.13, type: "sine" }],
  },
  {
    id: "arpeggio",
    label: "Arpeggio",
    notes: [
      { hz: 1046.5, at: 0, seconds: 0.12 },
      { hz: 1318.51, at: 0.1, seconds: 0.12 },
      { hz: 1567.98, at: 0.2, seconds: 0.24 },
    ],
  },
  {
    id: "knock",
    label: "Soft knock",
    notes: [
      // Low and short — the least intrusive option, for a quiet room.
      { hz: 196, at: 0, seconds: 0.09, type: "triangle" },
      { hz: 196, at: 0.14, seconds: 0.11, type: "triangle" },
    ],
  },
];

export function findBookingSound(id: string): BookingSound {
  return (
    BOOKING_SOUNDS.find((sound) => sound.id === id) ??
    BOOKING_SOUNDS.find((sound) => sound.id === DEFAULT_SOUND_ID)!
  );
}

/* ── Preferences ─────────────────────────────────────────────────────────── */

function browserStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Storage can throw outright when cookies are blocked.
    return null;
  }
}

/**
 * On unless explicitly turned off — a booking alert nobody hears is not much of
 * an alert, and the off switch is one click away in the sidebar.
 */
export function bookingSoundEnabled(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): boolean {
  return storage?.getItem(ENABLED_KEY) !== "off";
}

export function setBookingSoundEnabled(
  enabled: boolean,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  storage?.setItem(ENABLED_KEY, enabled ? "on" : "off");
  emit();
}

/** An unknown id falls back to the default rather than going silent. */
export function bookingSoundId(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): string {
  return findBookingSound(storage?.getItem(SOUND_KEY) ?? "").id;
}

export function setBookingSoundId(
  id: string,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  storage?.setItem(SOUND_KEY, findBookingSound(id).id);
  emit();
}

/**
 * 0–1. Anything unparseable — a stale value, corrupted storage — returns the
 * default rather than 0, because silently muting an alert is the worst
 * available failure.
 */
export function bookingSoundVolume(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): number {
  const raw = Number.parseFloat(storage?.getItem(VOLUME_KEY) ?? "");
  if (!Number.isFinite(raw)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, raw));
}

export function setBookingSoundVolume(
  volume: number,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  const clamped = Math.min(1, Math.max(0, volume));
  storage?.setItem(VOLUME_KEY, String(clamped));
  emit();
}

/* ── Change notification (for useSyncExternalStore) ──────────────────────── */

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeBookingSound(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // Keeps two tabs of the dashboard in step.
  const onStorage = () => emit();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

/* ── Playback ────────────────────────────────────────────────────────────── */

let context: AudioContext | null = null;
let lastPlayedAt = 0;

/** The shared context, created on first use. Null where Web Audio is absent. */
function audioContext(): AudioContext | null {
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

function schedule(ctx: AudioContext, sound: BookingSound, volume: number): void {
  try {
    for (const note of sound.notes) {
      const startAt = ctx.currentTime + note.at;
      const peak = Math.max(0.0002, PEAK_GAIN * volume * (note.gain ?? 1));
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = note.type ?? "triangle";
      oscillator.frequency.value = note.hz;

      // A hard start or stop on a raw oscillator clicks; ramp both ends.
      // Exponential ramps can never reach 0, hence the small floor.
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.seconds);

      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + note.seconds);
    }
  } catch {
    // A missing sound is not worth failing anything else over.
  }
}

/**
 * Unlock audio on the first click or keypress anywhere in the dashboard.
 *
 * Browsers refuse to start an AudioContext until the page has been interacted
 * with, so creating it lazily when a booking arrives is too late — the gesture
 * is long past and the context stays suspended. Creating it INSIDE a real
 * gesture handler starts it in `running` state; the listeners then remove
 * themselves. One click anywhere buys every chime for the session.
 *
 * Returns a cleanup for the caller's effect.
 */
export function primeBookingChime(): () => void {
  if (typeof window === "undefined") return () => {};

  const unlock = () => {
    const ctx = audioContext();
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
    remove();
  };
  const remove = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return remove;
}

/**
 * Play the selected sound, if it's enabled and one didn't just play.
 *
 * `preview` bypasses both the on/off setting and the rate limit — it is the
 * settings UI demonstrating a choice the owner just made, which should always
 * be audible even while they have the alert switched off.
 */
export function playBookingChime(
  preview?: { soundId: string; volume: number },
): void {
  if (typeof window === "undefined") return;
  if (!preview && !bookingSoundEnabled()) return;

  const now = Date.now();
  if (!preview && now - lastPlayedAt < MIN_GAP_MS) return;

  const ctx = audioContext();
  if (!ctx) return;

  const sound = findBookingSound(preview?.soundId ?? bookingSoundId());
  const volume = preview?.volume ?? bookingSoundVolume();

  // Resuming a context the browser hasn't unlocked rejects — which is why
  // `primeBookingChime` exists. Scheduling into a suspended context would queue
  // the notes to fire whenever it later resumes, long out of context.
  if (ctx.state === "suspended") {
    ctx.resume().then(
      () => {
        lastPlayedAt = Date.now();
        schedule(ctx, sound, volume);
      },
      () => {
        // Never unlocked; the booking still arrived by toast, SMS and email.
      },
    );
    return;
  }

  lastPlayedAt = now;
  schedule(ctx, sound, volume);
}
