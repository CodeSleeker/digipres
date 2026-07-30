"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  bookingAlertBody,
  type BookingAlertRow,
} from "@/lib/notifications/booking-alert";
import { playBookingChime } from "@/lib/notifications/chime";

/**
 * Live booking alerts for the whole admin area.
 *
 * Mounted in the admin LAYOUT rather than on the appointments page, so a new
 * booking reaches the owner wherever they are in the dashboard — and so the
 * count badge in the nav updates too. One subscription per session.
 *
 * `router.refresh()` re-runs the server components for the current route
 * INCLUDING the layout, which is what makes the nav badge and any visible list
 * update together without a manual reload.
 *
 * This is the "while the tab is open" channel; the SMS and email sent by
 * app/api/bookings are what reach the owner when it isn't.
 */

/** Realtime unreachable? Re-fetch on a timer so the dashboard still catches up. */
const FALLBACK_POLL_MS = 60_000;

/**
 * Raise a desktop notification, if the owner has allowed them and isn't
 * already looking at the dashboard.
 *
 * The visibility check is the point of the feature. With the tab in view the
 * toast below already says the same thing, and firing both is just noise; the
 * case worth interrupting is the browser minimised or the owner on another
 * tab. Note this still requires the browser to be RUNNING — real push with
 * everything closed needs a service worker and VAPID, which is a bigger piece
 * of work and, on iOS, only functions once the site is on the home screen.
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
    // service worker. Not worth failing the refresh over.
    console.warn("[notification]", error);
  }
}

export function LiveAppointments({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
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
          setCount((n) => n + 1);
          router.refresh();
          // Sound plays whether or not the tab is in view — the owner may be
          // across the room. The desktop notification below is the one that
          // would be redundant while they're looking at the screen.
          playBookingChime();
          notify(payload.new as BookingAlertRow);
        },
      )
      .subscribe((status, error) => {
        // Without this the failure mode is silent: the page simply never
        // updates and there is nothing to distinguish "no bookings yet" from
        // "the table was never added to the supabase_realtime publication".
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            "[realtime] appointments channel %s — is the table in the " +
              "supabase_realtime publication? (see migration 0024)",
            status,
            error ?? "",
          );
          setDegraded(true);
        }
        if (status === "SUBSCRIBED") setDegraded(false);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [businessId, router]);

  // Only runs when the channel actually failed, so a healthy deployment does
  // no polling at all.
  useEffect(() => {
    if (!degraded) return;
    const id = setInterval(() => router.refresh(), FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [degraded, router]);

  // Visible, not just a console line: a live feature that has silently stopped
  // is indistinguishable from a quiet day, and the owner is the one who needs
  // to know the page will no longer update by itself.
  if (degraded && count === 0) {
    return (
      <p className="fixed bottom-6 right-6 z-50 max-w-xs border border-dark-border bg-charcoal px-3 py-2 text-[0.65rem] leading-relaxed text-gray">
        Live updates are offline — this page now refreshes every minute
        instead.
      </p>
    );
  }

  if (count === 0) return null;

  return (
    <div
      // `status`, not `alert`: advisory. An assertive live region would
      // interrupt a screen-reader user mid-sentence for a routine event.
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-4 border border-gold/40 bg-charcoal px-4 py-3 text-sm text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
    >
      <span>
        {count === 1
          ? "A new booking just came in."
          : `${count} new bookings just came in.`}
      </span>
      <Link
        href="/admin/appointments"
        onClick={() => setCount(0)}
        className="whitespace-nowrap text-xs uppercase tracking-[2px] text-gold hover:underline"
      >
        View
      </Link>
      <button
        type="button"
        onClick={() => setCount(0)}
        aria-label="Dismiss"
        className="text-xs uppercase tracking-[2px] text-gray transition-colors hover:text-gold"
      >
        ✕
      </button>
    </div>
  );
}
