import { guardPage } from "@/lib/features/guard";
import Link from "next/link";
import { getAppointmentsForMonth } from "@/features/appointments/queries";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import { AppointmentTabs } from "../_components/appointment-tabs";

type SearchParams = Record<string, string | string[] | undefined>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CHIP_TONE: Record<AppointmentStatus, string> = {
  scheduled: "text-gray-light",
  confirmed: "text-gold",
  completed: "text-green-400",
  cancelled: "text-red-400 line-through",
  no_show: "text-red-400",
};

export default async function AppointmentsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await guardPage("appointments");

  const sp = await searchParams;
  const month = normalizeMonth(sp.month);
  const appointments = await getAppointmentsForMonth(month);

  const byDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const day = a.startsAt.slice(0, 10);
    const list = byDay.get(day);
    if (list) list.push(a);
    else byDay.set(day, [a]);
  }

  const [year, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl tracking-[2px]">Appointments</h1>
        <Link
          href="/admin/appointments/new"
          className="rounded-none bg-gold px-4 py-2 font-heading text-sm tracking-[2px] text-black transition-colors hover:bg-gold-light"
        >
          + NEW APPOINTMENT
        </Link>
      </div>

      <AppointmentTabs active="calendar" />

      <div className="flex items-center justify-between">
        <Link
          href={`/admin/appointments/calendar?month=${shiftMonth(month, -1)}`}
          className="rounded-none border border-dark-border px-3 py-1 text-sm text-white transition-colors hover:border-gold hover:text-gold"
        >
          ← Prev
        </Link>
        <span className="font-heading text-lg tracking-[2px]">
          {monthLabel(month)}
        </span>
        <Link
          href={`/admin/appointments/calendar?month=${shiftMonth(month, 1)}`}
          className="rounded-none border border-dark-border px-3 py-1 text-sm text-white transition-colors hover:border-gold hover:text-gold"
        >
          Next →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-dark-border text-[0.65rem] uppercase tracking-[1.5px] text-gray">
            {WEEKDAYS.map((w) => (
              <div key={w} className="p-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={`blank-${i}`}
                    className="min-h-24 border-b border-r border-dark-border/50 bg-black"
                  />
                );
              }
              const date = `${month}-${String(day).padStart(2, "0")}`;
              const dayAppts = byDay.get(date) ?? [];
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className="min-h-24 border-b border-r border-dark-border/50 p-1.5"
                >
                  <div
                    className={
                      isToday
                        ? "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[0.7rem] text-black"
                        : "mb-1 text-[0.7rem] text-gray"
                    }
                  >
                    {day}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayAppts.map((a) => (
                      <Link
                        key={a.id}
                        href={`/admin/appointments/${a.id}/edit`}
                        className={`block truncate text-[0.7rem] ${CHIP_TONE[a.status]} hover:underline`}
                        title={`${a.startsAt.slice(11, 16)} ${a.customerName ?? a.service ?? ""}`}
                      >
                        {a.startsAt.slice(11, 16)}{" "}
                        {a.customerName ?? a.service ?? "Appointment"}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeMonth(value: string | string[] | undefined): string {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) return value;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
