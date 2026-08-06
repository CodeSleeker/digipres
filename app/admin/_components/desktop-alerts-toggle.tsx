"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * Asks for permission to raise desktop notifications for new bookings.
 *
 * A button rather than an automatic prompt on load. Safari only grants
 * permission from a user gesture, Chrome penalises sites that ask unprompted,
 * and a permission dialog the owner didn't ask for is usually dismissed —
 * which is a permanent "denied" that can only be undone in browser settings.
 * Asking once, on a deliberate click, is the only version of this that works.
 *
 * Renders nothing once permission is granted, or where the API doesn't exist
 * (iOS Safari has no Notification outside an installed home-screen app).
 */
type State = NotificationPermission | "unsupported";

/**
 * `Notification.permission` is browser state this component doesn't own, so it
 * is read through `useSyncExternalStore` rather than copied into `useState` in
 * an effect. That is what makes it hydration-safe: React renders the server
 * snapshot first and swaps to the real value after, with no mismatch.
 */
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  // The Permissions API reports a grant or revoke made in browser settings,
  // outside this page. Optional — it isn't everywhere, and `emit()` after our
  // own request covers the case that matters.
  let status: PermissionStatus | null = null;
  let cancelled = false;
  navigator.permissions
    ?.query({ name: "notifications" as PermissionName })
    .then((result) => {
      if (cancelled) return;
      status = result;
      result.addEventListener("change", emit);
    })
    .catch(() => {
      // Firefox historically rejects this query. Nothing to fall back to.
    });

  return () => {
    cancelled = true;
    listeners.delete(onStoreChange);
    status?.removeEventListener("change", emit);
  };
}

function getSnapshot(): State {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported";
}

/** No browser on the server — render as if unsupported, i.e. render nothing. */
function getServerSnapshot(): State {
  return "unsupported";
}

export function DesktopAlertsToggle() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [asking, setAsking] = useState(false);

  if (state === "unsupported" || state === "granted") return null;

  if (state === "denied") {
    return (
      <p className="text-[0.65rem] leading-relaxed text-admin-muted">
        Desktop alerts are blocked for this site. Turn them back on in your
        browser’s site settings.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={asking}
      onClick={async () => {
        setAsking(true);
        try {
          await Notification.requestPermission();
        } finally {
          setAsking(false);
          emit(); // re-read the permission we just changed
        }
      }}
      className="text-left text-xs text-admin-muted transition-colors hover:text-admin-accent disabled:opacity-60"
    >
      {asking ? "Waiting for your browser…" : "Enable desktop alerts"}
    </button>
  );
}
