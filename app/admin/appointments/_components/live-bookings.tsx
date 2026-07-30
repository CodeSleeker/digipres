"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Live booking alerts on the appointments dashboard.
 *
 * Subscribes to INSERTs on `appointments` over Supabase Realtime. The database
 * filter is `business_id=eq.<id>`, and it is defence in depth rather than the
 * boundary: Realtime evaluates the subscriber's RLS policies against every
 * change before delivering it (migration 0024), so another tenant's bookings
 * are never sent to this browser in the first place.
 *
 * This is the "while the tab is open" channel. It deliberately does NOT replace
 * the SMS and email sent by app/api/bookings — those are what reach the owner
 * when the dashboard is closed, which is most of the time.
 */
export function LiveBookings({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`appointments:${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          setCount((n) => n + 1);
          // Re-run the server component so the new row appears in the table
          // with the customer name already resolved. Refreshing beats splicing
          // the payload in: the row arrives as raw columns, and the list is
          // paginated and status-filtered, so a client-side insert would often
          // put it somewhere it does not belong.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [businessId, router]);

  if (count === 0) return null;

  return (
    <div
      // `status`, not `alert`: this is advisory. An assertive live region would
      // interrupt a screen-reader user mid-sentence for a routine event.
      role="status"
      aria-live="polite"
      className="flex items-center justify-between border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-white"
    >
      <span>
        {count === 1
          ? "A new booking just came in."
          : `${count} new bookings just came in.`}
      </span>
      <button
        type="button"
        onClick={() => setCount(0)}
        className="text-xs uppercase tracking-[2px] text-gray transition-colors hover:text-gold"
      >
        Dismiss
      </button>
    </div>
  );
}
