import Link from "next/link";
import { getOwnerContext } from "@/lib/tenant/business-context";
import {
  CreationRepository,
  SubscriberRepository,
  DigestRepository,
} from "@/repositories/subscriber-repository";
import { deleteCreation } from "@/features/creations/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { canSend } from "@/services/subscriber-service";

export const dynamic = "force-dynamic";

/**
 * What this business has made lately, and who hears about it.
 *
 * The list and the mailing state are on ONE page deliberately. Adding a
 * creation is what causes an email to be sent, so the number of subscribers and
 * whether sending is switched on at all belong in the owner's eyeline while
 * they write — not on a settings page they visited once.
 */
export default async function CreationsPage() {
  const { supabase, business, businessId } = await getOwnerContext();
  if (!businessId || !business) {
    return (
      <p className="text-sm text-admin-muted">
        Create your business profile first.
      </p>
    );
  }

  const [creations, counts, digests] = await Promise.all([
    new CreationRepository(supabase).list(businessId),
    new SubscriberRepository(supabase).counts(businessId),
    new DigestRepository(supabase).history(businessId, 1),
  ]);
  const lastDigest = digests[0] ?? null;
  const sending = canSend(business);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-admin-heading text-2xl tracking-[2px]">
          New creations
        </h1>
        <Link
          href="/admin/creations/new"
          className="bg-admin-accent px-4 py-2 font-admin-heading text-sm tracking-[2px] text-admin-on-accent transition-colors hover:bg-admin-accent-hover"
        >
          ADD SOMETHING NEW
        </Link>
      </div>

      {/* The state of sending, said plainly. An owner writing these up needs to
          know whether anything will actually go out. */}
      <section className="border border-admin-line bg-admin-panel p-5">
        {sending ? (
          <p className="text-sm text-admin-muted">
            <span className="text-admin-fg">
              {counts.subscribed} subscriber
              {counts.subscribed === 1 ? "" : "s"}
            </span>{" "}
            will get an email each week — but only in a week where you have
            added something new.
            {counts.pending > 0 && (
              <>
                {" "}
                {counts.pending} more{" "}
                {counts.pending === 1 ? "has" : "have"} signed up but not yet
                confirmed their address.
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-admin-muted">
            Your newsletter isn&apos;t switched on yet, so there is no sign-up
            box on your website and nothing is emailed. Anything you add here is
            saved and will be included once it is set up — ask us to finish
            setting up your sending domain.
          </p>
        )}
        {lastDigest && (
          <p className="mt-2 text-xs text-admin-muted">
            Last sent {new Date(lastDigest.coveredTo).toLocaleDateString()} —{" "}
            {lastDigest.creationCount} item
            {lastDigest.creationCount === 1 ? "" : "s"} to {lastDigest.sentCount}{" "}
            {lastDigest.sentCount === 1 ? "person" : "people"}.
          </p>
        )}
      </section>

      {creations.length === 0 ? (
        <p className="text-sm text-admin-muted">
          Nothing yet. Add what you have made this week and it goes out in the
          next email.
        </p>
      ) : (
        <ul className="grid gap-3">
          {creations.map((creation) => (
            <li
              key={creation.id}
              className="flex flex-wrap items-start justify-between gap-4 border border-admin-line bg-admin-panel p-4"
            >
              <div className="min-w-0">
                <p className="text-sm text-admin-fg">{creation.name}</p>
                {creation.description && (
                  <p className="mt-1 max-w-prose text-xs leading-relaxed text-admin-muted">
                    {creation.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-admin-muted">
                  {new Date(creation.publishedAt).toLocaleDateString()}
                  {creation.price ? ` · ${creation.price}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/admin/creations/${creation.id}`}
                  className="text-xs uppercase tracking-[2px] text-admin-muted transition-colors hover:text-admin-accent"
                >
                  Edit
                </Link>
                <form action={deleteCreation}>
                  <input type="hidden" name="id" value={creation.id} />
                  <SubmitButton
                    pendingLabel="Removing…"
                    className="text-xs uppercase tracking-[2px] text-admin-muted transition-colors hover:text-destructive"
                  >
                    Remove
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
