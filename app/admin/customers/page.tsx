import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCustomers } from "@/features/customers/queries";
import { customerListQuerySchema } from "@/schemas/customer";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABEL,
  SMS_STATUSES,
  SMS_STATUS_LABEL,
  type Customer,
} from "@/types/customer";
import { DeleteCustomerButton } from "./_components/delete-customer-button";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = customerListQuerySchema.parse({
    q: sp.q,
    reviewStatus: sp.review,
    smsStatus: sp.sms,
    page: sp.page,
    pageSize: sp.pageSize,
  });

  const { rows, total, page, pageCount } = await getCustomers(query);
  const rangeStart = total === 0 ? 0 : (page - 1) * query.pageSize + 1;
  const rangeEnd = Math.min(page * query.pageSize, total);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-[2px]">Customers</h1>
          <p className="mt-1 text-sm text-gray">
            {total} {total === 1 ? "customer" : "customers"}
          </p>
        </div>
        <Link
          href="/admin/customers/new"
          className="rounded-none bg-gold px-4 py-2 font-heading text-sm tracking-[2px] text-black transition-colors hover:bg-gold-light"
        >
          + ADD CUSTOMER
        </Link>
      </div>

      {/* Search + filters (GET → URL). Submitting resets to page 1. */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 border border-dark-border bg-dark p-4"
      >
        <label className="flex flex-col gap-1 text-[0.7rem] uppercase tracking-[1.5px] text-gray">
          Search
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Name, mobile, email"
            className="h-9 w-56 rounded-none border border-dark-border bg-charcoal px-3 text-sm text-white outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] uppercase tracking-[1.5px] text-gray">
          Review
          <select
            name="review"
            defaultValue={query.reviewStatus ?? ""}
            className="h-9 rounded-none border border-dark-border bg-charcoal px-3 text-sm text-white outline-none focus:border-gold"
          >
            <option value="">All</option>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REVIEW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] uppercase tracking-[1.5px] text-gray">
          SMS
          <select
            name="sms"
            defaultValue={query.smsStatus ?? ""}
            className="h-9 rounded-none border border-dark-border bg-charcoal px-3 text-sm text-white outline-none focus:border-gold"
          >
            <option value="">All</option>
            {SMS_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SMS_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton
          pendingLabel="Applying…"
          className="inline-flex h-9 items-center rounded-none border border-dark-border px-4 text-sm text-white transition-colors hover:border-gold hover:text-gold"
        >
          Apply
        </SubmitButton>
        <Link
          href="/admin/customers"
          className="h-9 rounded-none px-3 text-sm leading-9 text-gray transition-colors hover:text-gold"
        >
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="min-w-0 overflow-x-auto border border-dark-border">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-dark-border text-left text-[0.65rem] uppercase tracking-[1.5px] text-gray">
              <th className="p-3 font-normal">Name</th>
              <th className="p-3 font-normal">Mobile</th>
              <th className="p-3 font-normal">Last visit</th>
              <th className="p-3 font-normal">Preferred staff</th>
              <th className="p-3 font-normal">Services</th>
              <th className="p-3 font-normal">Review</th>
              <th className="p-3 font-normal">SMS</th>
              <th className="p-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray">
                  No customers found.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr
                key={c.id}
                className="border-b border-dark-border/60 text-gray-light last:border-0"
              >
                <td className="p-3">
                  <div className="text-white">{c.name}</div>
                  {c.email && (
                    <div className="text-xs text-gray">{c.email}</div>
                  )}
                </td>
                <td className="p-3">{c.mobile ?? "—"}</td>
                <td className="p-3">{c.lastVisit ?? "—"}</td>
                <td className="p-3">{c.preferredStaff ?? "—"}</td>
                <td className="p-3">
                  {c.servicesAvailed.length
                    ? c.servicesAvailed.join(", ")
                    : "—"}
                </td>
                <td className="p-3">
                  <StatusBadge kind="review" customer={c} />
                </td>
                <td className="p-3">
                  <StatusBadge kind="sms" customer={c} />
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/customers/${c.id}/edit`}
                      className="text-xs text-gray transition-colors hover:text-gold"
                    >
                      Edit
                    </Link>
                    <DeleteCustomerButton id={c.id} name={c.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray">
        <span>
          {total === 0
            ? "No results"
            : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <PageLink query={query} page={page - 1} disabled={page <= 1}>
            ← Prev
          </PageLink>
          <span className="px-2">
            Page {page} of {pageCount}
          </span>
          <PageLink
            query={query}
            page={page + 1}
            disabled={page >= pageCount}
          >
            Next →
          </PageLink>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  kind,
  customer,
}: {
  kind: "review" | "sms";
  customer: Customer;
}) {
  const value =
    kind === "review" ? customer.reviewStatus : customer.smsStatus;
  const label =
    kind === "review"
      ? REVIEW_STATUS_LABEL[customer.reviewStatus]
      : SMS_STATUS_LABEL[customer.smsStatus];

  const tone: Record<string, string> = {
    received: "border-green-500/40 text-green-400",
    requested: "border-gold/40 text-gold",
    pending: "border-dark-border text-gray",
    sent: "border-green-500/40 text-green-400",
    not_sent: "border-dark-border text-gray",
    failed: "border-red-500/40 text-red-400",
    opted_out: "border-red-500/40 text-red-400",
  };

  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[0.7rem] ${tone[value] ?? "border-dark-border text-gray"}`}
    >
      {label}
    </span>
  );
}

function PageLink({
  query,
  page,
  disabled,
  children,
}: {
  query: { q?: string; reviewStatus?: string; smsStatus?: string };
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="px-3 py-1 text-dark-border">{children}</span>;
  }
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.reviewStatus) params.set("review", query.reviewStatus);
  if (query.smsStatus) params.set("sms", query.smsStatus);
  params.set("page", String(page));
  return (
    <Link
      href={`/admin/customers?${params.toString()}`}
      className="rounded-none border border-dark-border px-3 py-1 text-white transition-colors hover:border-gold hover:text-gold"
    >
      {children}
    </Link>
  );
}
