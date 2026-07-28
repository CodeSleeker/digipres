import Link from "next/link";
import { REVIEW_STATUS_LABEL } from "@/types/customer";
import type { RecentCustomer } from "@/types/dashboard";

const REVIEW_BADGE: Record<string, string> = {
  pending: "border-dark-border text-gray",
  requested: "border-gold/40 text-gold",
  received: "border-green-500/40 text-green-400",
};

/** Dashboard panel listing the most recently added customers. */
export function RecentCustomers({ rows }: { rows: RecentCustomer[] }) {
  return (
    <div className="border border-dark-border bg-dark">
      <div className="flex items-center justify-between border-b border-dark-border px-5 py-4">
        <h2 className="font-heading text-lg tracking-[2px]">Recent Customers</h2>
        <Link
          href="/admin/customers"
          className="text-xs text-gray transition-colors hover:text-gold"
        >
          View all →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray">
          No customers yet.{" "}
          <Link href="/admin/customers" className="text-gold hover:underline">
            Add your first customer
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-dark-border">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/customers/${c.id}/edit`}
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-charcoal"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 font-heading text-sm text-gold">
                    {initials(c.name)}
                  </span>
                  <div>
                    <p className="text-sm text-white">{c.name}</p>
                    <p className="text-xs text-gray">
                      {c.lastVisit
                        ? `Last visit ${formatDate(c.lastVisit)}`
                        : `Added ${formatDate(c.createdAt)}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-[1px] ${
                    REVIEW_BADGE[c.reviewStatus] ?? REVIEW_BADGE.pending
                  }`}
                >
                  {REVIEW_STATUS_LABEL[c.reviewStatus]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
