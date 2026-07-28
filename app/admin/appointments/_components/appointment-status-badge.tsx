import {
  APPOINTMENT_STATUS_LABEL,
  type AppointmentStatus,
} from "@/types/appointment";

const TONE: Record<AppointmentStatus, string> = {
  scheduled: "border-dark-border text-gray-light",
  confirmed: "border-gold/40 text-gold",
  completed: "border-green-500/40 text-green-400",
  cancelled: "border-red-500/40 text-red-400",
  no_show: "border-red-500/40 text-red-400",
};

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[0.7rem] ${TONE[status]}`}
    >
      {APPOINTMENT_STATUS_LABEL[status]}
    </span>
  );
}
