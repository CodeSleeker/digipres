import { guardPage } from "@/lib/features/guard";
import Link from "next/link";
import { getReviewMessages } from "@/features/reviews/queries";
import { reviewMessageListQuerySchema } from "@/schemas/review-message";
import {
  REVIEW_MESSAGE_STATUSES,
  REVIEW_MESSAGE_STATUS_LABEL,
  REVIEW_STEP_LABEL,
  type ReviewMessageStatus,
} from "@/types/review-message";
import { ProcessNowButton } from "./_components/process-now-button";

type SearchParams = Record<string, string | string[] | undefined>;

const TONE: Record<ReviewMessageStatus, string> = {
  queued: "border-dark-border text-gray-light",
  sent: "border-gold/40 text-gold",
  delivered: "border-green-500/40 text-green-400",
  failed: "border-red-500/40 text-red-400",
  cancelled: "border-dark-border text-gray",
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await guardPage("reviews");

  const sp = await searchParams;
  const query = reviewMessageListQuerySchema.parse({
    status: sp.status,
    page: sp.page,
    pageSize: sp.pageSize,
  });

  const { rows, total, page, pageCount } = await getReviewMessages(query);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-[2px]">
            Review Automation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray">
            Messages are queued when an appointment is completed (thank-you now,
            review request in 3 days, reminder in 5 more) and cancelled if the
            customer reviews. SMS sending is stubbed until a provider is
            connected.
          </p>
        </div>
        <ProcessNowButton />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 border border-dark-border bg-dark p-4"
      >
        <label className="flex flex-col gap-1 text-[0.7rem] uppercase tracking-[1.5px] text-gray">
          Status
          <select
            name="status"
            defaultValue={query.status ?? ""}
            className="h-9 rounded-none border border-dark-border bg-charcoal px-3 text-sm text-white outline-none focus:border-gold"
          >
            <option value="">All</option>
            {REVIEW_MESSAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REVIEW_MESSAGE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-9 rounded-none border border-dark-border px-4 text-sm text-white transition-colors hover:border-gold hover:text-gold"
        >
          Apply
        </button>
        <Link
          href="/admin/reviews"
          className="h-9 px-3 text-sm leading-9 text-gray transition-colors hover:text-gold"
        >
          Clear
        </Link>
      </form>

      <div className="min-w-0 overflow-x-auto border border-dark-border">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-dark-border text-left text-[0.65rem] uppercase tracking-[1.5px] text-gray">
              <th className="p-3 font-normal">Customer</th>
              <th className="p-3 font-normal">Step</th>
              <th className="p-3 font-normal">Status</th>
              <th className="p-3 font-normal">Scheduled</th>
              <th className="p-3 font-normal">Sent</th>
              <th className="p-3 font-normal">Tries</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray">
                  No review messages yet. Complete an appointment to start one.
                </td>
              </tr>
            )}
            {rows.map((m) => (
              <tr
                key={m.id}
                className="border-b border-dark-border/60 text-gray-light last:border-0"
              >
                <td className="p-3">
                  <div className="text-white">{m.customerName}</div>
                  <div className="text-xs text-gray">{m.toMobile}</div>
                </td>
                <td className="p-3">{REVIEW_STEP_LABEL[m.step]}</td>
                <td className="p-3">
                  <span
                    className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[0.7rem] ${TONE[m.status]}`}
                  >
                    {REVIEW_MESSAGE_STATUS_LABEL[m.status]}
                  </span>
                  {m.lastError && (
                    <div className="mt-1 text-xs text-red-400">
                      {m.lastError}
                    </div>
                  )}
                </td>
                <td className="p-3">{formatDt(m.scheduledAt)}</td>
                <td className="p-3">{m.sentAt ? formatDt(m.sentAt) : "—"}</td>
                <td className="p-3">{m.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray">
        <span>{total} total</span>
        <div className="flex items-center gap-2">
          <PageLink status={query.status} page={page - 1} disabled={page <= 1}>
            ← Prev
          </PageLink>
          <span className="px-2">
            Page {page} of {pageCount}
          </span>
          <PageLink
            status={query.status}
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

function formatDt(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

function PageLink({
  status,
  page,
  disabled,
  children,
}: {
  status?: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="px-3 py-1 text-dark-border">{children}</span>;
  }
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  return (
    <Link
      href={`/admin/reviews?${params.toString()}`}
      className="rounded-none border border-dark-border px-3 py-1 text-white transition-colors hover:border-gold hover:text-gold"
    >
      {children}
    </Link>
  );
}
