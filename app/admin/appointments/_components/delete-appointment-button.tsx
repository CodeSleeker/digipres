"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAppointment } from "@/features/appointments/actions";

/**
 * Delete, with the row removed from view the moment the server confirms.
 *
 * `router.refresh()` alone was leaving the deleted row on screen until a manual
 * reload. Rather than depend on the refetch landing, the button hides its own
 * row directly and asks for the refresh as well — so the list is correct
 * immediately and the server's version catches up behind it.
 *
 * `hidden` on the <tr> rather than removing an item from a list: this component
 * doesn't own the table, and hiding the closest row is the smallest thing that
 * can't get out of step with it. The row returns on any real re-render, by
 * which point the server has dropped it anyway.
 */
export function DeleteAppointmentButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useState(false);
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending || removed}
      onClick={(event) => {
        if (!window.confirm("Delete this appointment?")) return;
        const row = event.currentTarget.closest("tr");
        const fd = new FormData();
        fd.set("id", id);

        start(async () => {
          const result = await deleteAppointment(fd);
          // Only hide it if the server actually deleted it — otherwise the row
          // would vanish while still being in the database.
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          setRemoved(true);
          row?.setAttribute("hidden", "");
          router.refresh();
        });
      }}
      className="text-xs text-gray transition-colors hover:text-destructive disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
