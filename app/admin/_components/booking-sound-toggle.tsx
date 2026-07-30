"use client";

import { useSyncExternalStore } from "react";
import {
  bookingSoundEnabled,
  playBookingChime,
  setBookingSoundEnabled,
} from "@/lib/notifications/chime";

/**
 * Mute switch for the new-booking chime.
 *
 * Turning it back ON plays the sound once. That is not a flourish: browsers
 * won't start audio until the page has been interacted with, so this click is
 * what unlocks the audio context for the rest of the session — and it also
 * proves the volume is up, which is the only way to know the alert will
 * actually be heard later.
 */
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // Keeps two tabs of the dashboard in step.
  const onStorage = () => emit();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => bookingSoundEnabled();
/** No storage on the server; the default is "on", same as a first visit. */
const getServerSnapshot = () => true;

export function BookingSoundToggle() {
  const enabled = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => {
        setBookingSoundEnabled(!enabled);
        emit();
        if (!enabled) playBookingChime();
      }}
      className="text-left text-xs text-gray transition-colors hover:text-gold"
    >
      {enabled ? "Booking sound: on" : "Booking sound: off"}
    </button>
  );
}
