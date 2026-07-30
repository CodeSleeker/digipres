import { stopImpersonation } from "@/features/platform/impersonation";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Always-visible reminder that this is a staff session acting on a client's
 * behalf — so a support session can never be mistaken for the owner's own, and
 * exiting is always one click away.
 */
export function ImpersonationBanner({ businessName }: { businessName: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/40 bg-gold/10 px-8 py-2.5">
      <p className="text-xs text-gold">
        Acting as <span className="font-semibold">{businessName}</span> — changes
        you make are recorded against your account.
      </p>
      <form action={stopImpersonation}>
        <SubmitButton
          pendingLabel="Exiting…"
          className="text-xs uppercase tracking-[1.5px] text-gold underline-offset-4 transition-colors hover:underline"
        >
          Exit
        </SubmitButton>
      </form>
    </div>
  );
}
