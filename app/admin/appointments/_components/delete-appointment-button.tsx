"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAppointment } from "@/features/appointments/actions";

export function DeleteAppointmentButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this appointment?")) return;
        const fd = new FormData();
        fd.set("id", id);
        start(async () => {
          await deleteAppointment(fd);
          router.refresh();
        });
      }}
      className="text-xs text-gray transition-colors hover:text-destructive disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
