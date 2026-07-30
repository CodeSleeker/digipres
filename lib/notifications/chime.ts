/**
 * The sound a new booking makes in the dashboard.
 *
 * Synthesised with the Web Audio API rather than played from an mp3: no binary
 * asset to commit, no request to make, nothing to fail on a slow connection,
 * and no `media-src` question for the CSP. Two short notes is all this needs.
 */

const STORAGE_KEY = "admin:booking-sound";

/** Roughly A5 → D6. A rising pair reads as "something arrived", not "error". */
const NOTES = [880, 1174.66];
const NOTE_SECONDS = 0.18;
const PEAK_GAIN = 0.14;

/** A burst of bookings shouldn't turn into a burst of chimes. */
const MIN_GAP_MS = 2000;

let context: AudioContext | null = null;
let lastPlayedAt = 0;

function browserStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Storage can throw outright when cookies are blocked.
    return null;
  }
}

/**
 * On unless explicitly turned off — a booking alert nobody hears is not much
 * of an alert, and the off switch is one click away in the sidebar.
 */
export function bookingSoundEnabled(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): boolean {
  return storage?.getItem(STORAGE_KEY) !== "off";
}

export function setBookingSoundEnabled(
  enabled: boolean,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  storage?.setItem(STORAGE_KEY, enabled ? "on" : "off");
}

/**
 * Play the chime, if it's enabled and one didn't just play.
 *
 * Never throws and never awaits anything the caller cares about. Browsers
 * refuse to start audio until the page has been interacted with, so on a
 * dashboard left open and untouched this simply does nothing — which is the
 * correct outcome, not an error worth surfacing.
 */
export function playBookingChime(): void {
  if (typeof window === "undefined") return;
  if (!bookingSoundEnabled()) return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;

  try {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    context ??= new Ctor();
    // Autoplay policy parks the context until a user gesture; resuming is
    // free if it's already running and rejects harmlessly if it isn't allowed.
    void context.resume().catch(() => {});

    NOTES.forEach((frequency, index) => {
      const startAt = context!.currentTime + index * NOTE_SECONDS;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();

      // Triangle over sine: a little more presence in a noisy shop without
      // the harshness of a square wave.
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;

      // A hard start or stop on a raw oscillator clicks. Ramp both ends.
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + NOTE_SECONDS);

      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + NOTE_SECONDS);
    });
  } catch {
    // Web Audio unavailable or blocked — a missing sound is not worth failing
    // the refresh that matters.
  }
}
