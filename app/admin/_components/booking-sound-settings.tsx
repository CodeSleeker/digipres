"use client";

import { useSyncExternalStore } from "react";
import {
  BOOKING_SOUNDS,
  DEFAULT_SOUND_ID,
  DEFAULT_VOLUME,
  bookingSoundEnabled,
  bookingSoundId,
  bookingSoundVolume,
  playBookingChime,
  setBookingSoundEnabled,
  setBookingSoundId,
  setBookingSoundVolume,
  subscribeBookingSound,
} from "@/lib/notifications/chime";

/**
 * Booking sound: on/off, which one, and how loud.
 *
 * Every control PREVIEWS on change. That isn't a flourish — browsers won't
 * start audio until the page has been interacted with, so these clicks are also
 * what unlock it, and hearing the choice is the only way to know the volume is
 * actually up. Preview deliberately plays even while the alert is switched off,
 * so the sound can be set up before turning it on.
 *
 * Each value is read through `useSyncExternalStore` rather than copied into
 * state: it lives in localStorage, which this component doesn't own, and two
 * open tabs should agree.
 */
const getServerEnabled = () => true;
const getServerSoundId = () => DEFAULT_SOUND_ID;
const getServerVolume = () => DEFAULT_VOLUME;

export function BookingSoundSettings() {
  const enabled = useSyncExternalStore(
    subscribeBookingSound,
    () => bookingSoundEnabled(),
    getServerEnabled,
  );
  const soundId = useSyncExternalStore(
    subscribeBookingSound,
    () => bookingSoundId(),
    getServerSoundId,
  );
  const volume = useSyncExternalStore(
    subscribeBookingSound,
    () => bookingSoundVolume(),
    getServerVolume,
  );

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => {
          setBookingSoundEnabled(!enabled);
          if (!enabled) playBookingChime({ soundId, volume });
        }}
        className="text-left text-xs text-admin-muted transition-colors hover:text-admin-accent"
      >
        {enabled ? "Booking sound: on" : "Booking sound: off"}
      </button>

      {enabled && (
        <>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Booking sound</span>
            <select
              value={soundId}
              onChange={(event) => {
                setBookingSoundId(event.target.value);
                playBookingChime({ soundId: event.target.value, volume });
              }}
              className="w-full rounded-none border border-admin-line bg-admin-field px-2 py-1 text-[0.7rem] text-admin-fg outline-none focus:border-admin-accent"
            >
              {BOOKING_SOUNDS.map((sound) => (
                <option key={sound.id} value={sound.id}>
                  {sound.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="sr-only">Booking sound volume</span>
            <span aria-hidden="true" className="text-[0.65rem] text-admin-muted">
              Vol
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(event) =>
                setBookingSoundVolume(Number(event.target.value))
              }
              // Preview on release, not on every step — dragging the slider
              // would otherwise fire a chime per tick.
              onPointerUp={() => playBookingChime({ soundId, volume })}
              onKeyUp={() => playBookingChime({ soundId, volume })}
              className="h-1 w-full accent-admin-accent"
            />
          </label>
        </>
      )}
    </div>
  );
}
