import Link from "next/link";
import { cn } from "@/lib/utils";

/** List/Calendar view toggle shown at the top of the appointments pages. */
export function AppointmentTabs({ active }: { active: "list" | "calendar" }) {
  const tab = "border-b-2 px-1 pb-2 text-sm transition-colors";
  return (
    <div className="flex gap-6 border-b border-admin-line">
      <Link
        href="/admin/appointments"
        className={cn(
          tab,
          active === "list"
            ? "border-admin-accent text-admin-fg"
            : "border-transparent text-admin-muted hover:text-admin-accent",
        )}
      >
        List
      </Link>
      <Link
        href="/admin/appointments/calendar"
        className={cn(
          tab,
          active === "calendar"
            ? "border-admin-accent text-admin-fg"
            : "border-transparent text-admin-muted hover:text-admin-accent",
        )}
      >
        Calendar
      </Link>
    </div>
  );
}
