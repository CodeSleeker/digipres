import Link from "next/link";
import { getAuditTrail } from "@/features/platform/queries";
import { AuditTable } from "../_components/audit-table";

const PAGE_SIZE = 50;

/**
 * The staff activity trail: every impersonation window, and every mutation made
 * inside one. This is the read side of the audit log — writing it is pointless
 * if nobody can answer a client asking "who changed this?".
 */
export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; business?: string }>;
}) {
  const { page: rawPage, business } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const trail = await getAuditTrail({
    page,
    pageSize: PAGE_SIZE,
    actingBusinessId: business,
  });

  const href = (n: number) =>
    `/platform/audit?page=${n}${business ? `&business=${business}` : ""}`;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-admin-heading text-2xl tracking-[2px]">Audit Trail</h1>
        <p className="mt-1 max-w-2xl text-sm text-admin-muted">
          {business
            ? "Staff activity for this business."
            : "Staff activity across every client. Owners editing their own data are not listed — only actions taken on a client's behalf."}
        </p>
      </div>

      {business && (
        <Link
          href="/platform/audit"
          className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
        >
          ← All businesses
        </Link>
      )}

      <AuditTable rows={trail.rows} />

      {trail.pageCount > 1 && (
        <nav className="flex items-center gap-4 text-xs text-admin-muted">
          {page > 1 ? (
            <Link href={href(page - 1)} className="hover:text-admin-accent">
              ← Newer
            </Link>
          ) : (
            <span className="opacity-40">← Newer</span>
          )}
          <span>
            Page {trail.page} of {trail.pageCount} · {trail.total} entries
          </span>
          {page < trail.pageCount ? (
            <Link href={href(page + 1)} className="hover:text-admin-accent">
              Older →
            </Link>
          ) : (
            <span className="opacity-40">Older →</span>
          )}
        </nav>
      )}
    </div>
  );
}
