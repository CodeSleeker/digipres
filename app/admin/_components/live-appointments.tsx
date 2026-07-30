"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  bookingAlertBody,
  type BookingAlertRow,
} from "@/lib/notifications/booking-alert";
import { playBookingChime, primeBookingChime } from "@/lib/notifications/chime";
import {
  addNewBooking,
  getNewBookings,
  getServerNewBookings,
  resetNewBookings,
  subscribeNewBookings,
} from "./new-bookings-store";

/**
 * Live booking alerts for the whole admin area.
 *
 * Mounted in the admin layout so a booking reaches the owner wherever they are
 * in the dashboard. One subscription per session.
 *
 * NOTHING THE OWNER IS READING MOVES when a booking arrives. The sound plays,
 * the toast appears and the sidebar badge ticks up — all of which are additive
 * and shift nothing — but the list stays exactly as it was. Re-rendering
 * underneath someone mid-task is the kind of "helpful" that loses work; the
 * toast's Show button is how the new rows get pulled in, when they're ready.
 */
type Status = "connecting" | "live" | "offline";

const STATUS_LABEL: Record<Status, string> = {
  connecting: "Live updates: connecting…",
  live: "Live updates: on",
  offline: "Live updates: offline",
};

export function LiveAppointments({ businessId }: { businessId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>("connecting");

  // Shared with the nav badge, so the toast and the number can't disagree.
  const count = useSyncExternalStore(
    subscribeNewBookings,
    getNewBookings,
    getServerNewBookings,
  );

  // Navigating re-runs the layout on the server, so its count already includes
  // these; keeping the delta would count them twice.
  useEffect(() => resetNewBookings, [pathname]);

  // Audio has to be unlocked by a real gesture. Arming this on mount means the
  // owner's first click anywhere pays for every chime for the session.
  useEffect(() => primeBookingChime(), []);

  /**
   * How many of those the owner has already waved away. Dismiss hides the toast
   * without clearing the badge — the bookings are still unconfirmed, and the
   * badge is the standing reminder that the toast was only the announcement.
   */
  const [dismissed, setDismissed] = useState(0);
  // The delta was reset (a refresh or a navigation) — resync rather than leave
  // a high-water mark that would swallow the next toast.
  if (dismissed > count) setDismissed(count);
  const unseen = count - dismissed;

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const subscribe = () =>
      supabase
        .channel(`admin-appointments:${businessId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "appointments",
            filter: `business_id=eq.${businessId}`,
          },
          (payload) => {
            addNewBooking();
            // Sound plays whether or not the tab is in view — the owner may be
            // across the room. The desktop notification is the one that would
            // be redundant while they're looking at the screen.
            playBookingChime();
            notify(payload.new as BookingAlertRow);
          },
        )
        .subscribe((state, error) => {
          // Logged unconditionally, not just on failure: "did it connect?" is
          // the first question whenever this misbehaves, and a silent success
          // leaves no way to tell a healthy channel from one that never
          // started.
          console.info("[realtime] appointments channel:", state, error ?? "");
          if (state === "SUBSCRIBED") setStatus("live");
          else if (state !== "CLOSED") setStatus("offline");
        });

    /**
     * Put the user's JWT on the socket BEFORE joining.
     *
     * The client is configured with an async `accessToken` callback, so in
     * principle this is automatic — but the session is read from cookies
     * asynchronously and this effect runs the moment the component mounts. Win
     * that race and the channel joins as `anon`.
     *
     * That failure is invisible, which is what makes it worth this much
     * ceremony: joining succeeds either way, so the channel reports SUBSCRIBED
     * and looks healthy. But every policy on `appointments` is granted `to
     * authenticated`, so an anonymous subscriber matches no rows and Realtime
     * drops every event without a word. Awaiting the session removes the race
     * rather than hoping it resolves in time.
     */
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const token = data.session?.access_token;
      if (!token) {
        console.error("[realtime] no session — cannot subscribe as the owner");
        setStatus("offline");
        return;
      }

      await supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [businessId]);

  return (
    <>
      {/* Always rendered. The owner can see at a glance whether the dashboard
          will tell them about a booking — and if this line is missing entirely,
          the component never mounted. */}
      <span className="text-[0.65rem] text-gray">{STATUS_LABEL[status]}</span>

      {unseen > 0 && (
        <div
          // `status`, not `alert`: advisory. An assertive live region would
          // interrupt a screen-reader user mid-sentence for a routine event.
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-4 border border-gold/40 bg-charcoal px-4 py-3 text-sm text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
        >
          <span>
            {unseen === 1
              ? "A new booking just came in."
              : `${unseen} new bookings just came in.`}
          </span>
          <button
            type="button"
            onClick={() => {
              // The refresh brings the server count up to date, so the delta
              // must go — otherwise the badge counts these bookings twice.
              resetNewBookings();
              setDismissed(0);
              // The one place the page is allowed to update itself, because
              // the owner just asked it to.
              router.refresh();
            }}
            className="whitespace-nowrap text-xs uppercase tracking-[2px] text-gold hover:underline"
          >
            Show
          </button>
          <button
            type="button"
            // Dismiss hides the toast but leaves the badge alone — the
            // bookings are still unconfirmed, and the badge is the standing
            // reminder that the toast was only the announcement.
            onClick={() => setDismissed(count)}
            aria-label="Dismiss"
            className="text-xs uppercase tracking-[2px] text-gray transition-colors hover:text-gold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Raise a desktop notification, if the owner has allowed them and isn't already
 * looking at the dashboard.
 *
 * Still requires the browser to be RUNNING — real push with everything closed
 * needs a service worker and VAPID, and on iOS only works once the site is on
 * the home screen.
 */
function notify(row: BookingAlertRow): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    const notification = new Notification("New booking", {
      body: bookingAlertBody(row),
      icon: "/brand/icon-192.png",
      // A stable tag collapses a burst into one notification rather than
      // stacking five; the dashboard behind it has the full list.
      tag: "new-booking",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    // Some browsers refuse a page-constructed Notification and require a
    // service worker. Not worth failing over.
    console.warn("[notification]", error);
  }
}
