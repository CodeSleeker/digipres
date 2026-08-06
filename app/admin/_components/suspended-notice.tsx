/**
 * Shown in place of the dashboard when a business isn't `active`.
 *
 * Deliberately not a lockout: the owner can still sign in and read why, which
 * is what lets them resolve it. Platform staff acting as the tenant bypass this
 * entirely (see app/admin/layout.tsx) so they can inspect and fix the account.
 */
export function SuspendedNotice({
  businessName,
  status,
}: {
  businessName: string;
  status: "draft" | "suspended";
}) {
  const draft = status === "draft";

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-xs uppercase tracking-[3px] text-admin-accent">
        {draft ? "Not published yet" : "Account suspended"}
      </p>
      <h1 className="mt-3 font-admin-heading text-2xl tracking-[2px]">
        {businessName}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-admin-fg/80">
        {draft ? (
          <>
            This business hasn&apos;t been published yet, so the website
            isn&apos;t live and the dashboard is on hold. We&apos;ll be in touch
            as soon as setup is complete.
          </>
        ) : (
          <>
            Service for this account is paused, so the website is temporarily
            offline and the dashboard is unavailable. Your data is safe and
            nothing has been deleted.
          </>
        )}
      </p>
      <p className="mt-6 text-sm text-admin-muted">
        Please contact support to restore access.
      </p>
    </div>
  );
}
