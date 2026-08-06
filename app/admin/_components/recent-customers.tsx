import Link from "next/link";
import { REVIEW_STATUS_LABEL } from "@/types/customer";
import type { RecentCustomer } from "@/types/dashboard";

const REVIEW_BADGE: Record<string, string> = {
  pending: "border-admin-line text-admin-muted",
  requested: "border-admin-accent/40 text-admin-accent",
  received: "border-green-500/40 text-green-400",
};

/** Dashboard panel listing the most recently added customers. */
export function RecentCustomers({ rows }: { rows: RecentCustomer[] }) {
  return (
    <div className="border border-admin-line bg-admin-panel">
      <div className="flex items-center justify-between border-b border-admin-line px-5 py-4">
        <h2 className="font-admin-heading text-lg tracking-[2px]">Recent Customers</h2>
        <Link
          href="/admin/customers"
          className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
        >
          View all →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-admin-muted">
          No customers yet.{" "}
          <Link href="/admin/customers" className="text-admin-accent hover:underline">
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
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-admin-field"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-admin-accent/10 font-admin-heading text-sm text-admin-accent">
                    {initials(c.name)}
                  </span>
                  <div>
                    <p className="text-sm text-admin-fg">{c.name}</p>
                    <p className="text-xs text-admin-muted">
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
