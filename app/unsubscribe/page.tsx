import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { SubscriberService } from "@/services/subscriber-service";
import { logError } from "@/lib/observability/logger";
import { AuthShell } from "@/components/marketing/auth-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};

/**
 * Leaving a list, in one click and with no account.
 *
 * Done on GET, and not behind a confirmation step. The usual argument against a
 * state-changing GET is prefetching — but here the worst case is that someone
 * who wanted to leave has left, which is the outcome they asked for. Making
 * them confirm protects nothing and costs the people who will otherwise reach
 * for the spam button instead, which is far more expensive to a sender than one
 * unsubscribe.
 *
 * Idempotent and identical for any token: a second click, an expired link and a
 * value someone made up all end here saying the same thing. Distinguishing them
 * would turn this into a way to test which addresses are on which list.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (token) {
    try {
      await new SubscriberService(createServiceClient()).unsubscribe(token);
    } catch (error) {
      // Logged, not shown. Someone who asked to leave should not be handed an
      // error page about our database.
      logError(error, { scope: "subscribe:unsubscribe" });
    }
  }

  return (
    <AuthShell
      title="You're unsubscribed"
      subtitle="You won't receive any more updates. Nothing else changes — any orders or bookings you've made are unaffected."
    >
      <p className="text-sm text-admin-muted">
        Changed your mind? Use the sign-up form on the site to join again.
      </p>
    </AuthShell>
  );
}
