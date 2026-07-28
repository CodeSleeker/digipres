import Link from "next/link";
import { cn } from "@/lib/utils";

/** List/Calendar view toggle shown at the top of the appointments pages. */
export function AppointmentTabs({ active }: { active: "list" | "calendar" }) {
  const tab = "border-b-2 px-1 pb-2 text-sm transition-colors";
  return (
    <div className="flex gap-6 border-b border-dark-border">
      <Link
        href="/admin/appointments"
        className={cn(
          tab,
          active === "list"
            ? "border-gold text-white"
            : "border-transparent text-gray hover:text-gold",
        )}
      >
        List
      </Link>
      <Link
        href="/admin/appointments/calendar"
        className={cn(
          tab,
          active === "calendar"
            ? "border-gold text-white"
            : "border-transparent text-gray hover:text-gold",
        )}
      >
        Calendar
      </Link>
    </div>
  );
}
