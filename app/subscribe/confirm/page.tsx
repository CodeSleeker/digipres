import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { SubscriberService } from "@/services/subscriber-service";
import { logError } from "@/lib/observability/logger";
import { AuthShell } from "@/components/marketing/auth-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your subscription",
  robots: { index: false, follow: false },
};

/**
 * The landing page for a confirmation link.
 *
 * A GET that changes state, which is normally worth avoiding — but the whole
 * point of confirmed opt-in is that clicking the link IS the proof, and asking
 * someone to click a link and then press a button loses the people who were
 * already only half interested. The token is single-use and burned on arrival,
 * so a prefetching mail client costs the click rather than allowing anything
 * else.
 *
 * Every outcome reads the same way to the visitor. A token that matches nothing
 * is almost always a second click on a spent link, and telling that person
 * something went wrong would be both unhelpful and untrue.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let confirmed = false;

  if (token) {
    try {
      const service = new SubscriberService(createServiceClient());
      await service.confirm(token);
      confirmed = true;
    } catch (error) {
      logError(error, { scope: "subscribe:confirm" });
    }
  }

  return (
    <AuthShell
      title={confirmed ? "You're subscribed" : "Nothing to confirm"}
      subtitle={
        confirmed
          ? "Thank you — you'll hear from us when there's something new."
          : "That link has already been used, or it isn't one of ours. If you meant to subscribe, use the form on the site again."
      }
    >
      <p className="text-sm text-admin-muted">
        You can unsubscribe from any email we send, at any time.
      </p>
    </AuthShell>
  );
}
