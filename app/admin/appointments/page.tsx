import Link from "next/link";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { requireFeature } from "@/lib/features/guard";
import { getAppointments } from "@/features/appointments/queries";
import { appointmentListQuerySchema } from "@/schemas/appointment";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABEL,
} from "@/types/appointment";
import { AppointmentTabs } from "./_components/appointment-tabs";
import { AppointmentStatusBadge } from "./_components/appointment-status-badge";
import { DeleteAppointmentButton } from "./_components/delete-appointment-button";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AppointmentsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // The nav hides this when the plan excludes it; this is what actually stops
  // someone reaching it by URL.
  const { supabase, businessId } = await getOwnerContext();
  await requireFeature(supabase, businessId, "appointments");

  const sp = await searchParams;
  const query = appointmentListQuerySchema.parse({
    status: sp.status,
    page: sp.page,
    pageSize: sp.pageSize,
  });

  const { rows, total, page, pageCount } = await getAppointments(query);
  const rangeStart = total === 0 ? 0 : (page - 1) * query.pageSize + 1;
  const rangeEnd = Math.min(page * query.pageSize, total);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl tracking-[2px]">Appointments</h1>
        <Link
          href="/admin/appointments/new"
          className="rounded-none bg-gold px-4 py-2 font-heading text-sm tracking-[2px] text-black transition-colors hover:bg-gold-light"
        >
          + NEW APPOINTMENT
        </Link>
      </div>

      <AppointmentTabs active="list" />

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
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {APPOINTMENT_STATUS_LABEL[s]}
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
          href="/admin/appointments"
          className="h-9 px-3 text-sm leading-9 text-gray transition-colors hover:text-gold"
        >
          Clear
        </Link>
      </form>

      <div className="min-w-0 overflow-x-auto border border-dark-border">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-dark-border text-left text-[0.65rem] uppercase tracking-[1.5px] text-gray">
              <th className="p-3 font-normal">When</th>
              <th className="p-3 font-normal">Customer</th>
              <th className="p-3 font-normal">Service</th>
              <th className="p-3 font-normal">Staff</th>
              <th className="p-3 font-normal">Status</th>
              <th className="p-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray">
                  No appointments found.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr
                key={a.id}
                className="border-b border-dark-border/60 text-gray-light last:border-0"
              >
                <td className="p-3">
                  <div className="text-white">{a.startsAt.slice(0, 10)}</div>
                  <div className="text-xs text-gray">
                    {a.startsAt.slice(11, 16)}
                    {a.endsAt ? `–${a.endsAt.slice(11, 16)}` : ""}
                  </div>
                </td>
                <td className="p-3">{a.customerName ?? "—"}</td>
                <td className="p-3">{a.service ?? "—"}</td>
                <td className="p-3">{a.staff ?? "—"}</td>
                <td className="p-3">
                  <AppointmentStatusBadge status={a.status} />
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/appointments/${a.id}/edit`}
                      className="text-xs text-gray transition-colors hover:text-gold"
                    >
                      Edit
                    </Link>
                    <DeleteAppointmentButton id={a.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray">
        <span>
          {total === 0
            ? "No results"
            : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </span>
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
      href={`/admin/appointments?${params.toString()}`}
      className="rounded-none border border-dark-border px-3 py-1 text-white transition-colors hover:border-gold hover:text-gold"
    >
      {children}
    </Link>
  );
}
