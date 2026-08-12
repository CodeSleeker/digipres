"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEnquiry, markEnquiryRead } from "@/features/enquiries/actions";

/**
 * Mark read, and remove.
 *
 * Both hide their own card the moment the server confirms rather than waiting
 * for the refetch to land — the same reasoning as the appointments delete
 * button, and for the same symptom: a row that stays on screen after you have
 * acted on it reads as a failure.
 *
 * "Mark read" is a button rather than something that fires on render. An
 * enquiry marked read by the page merely being open is one the owner can scroll
 * past and never see again, and the unread badge is the only thing telling them
 * to come back.
 */
export function EnquiryActions({
  id,
  unread,
}: {
  id: string;
  unread: boolean;
}) {
  const [pending, start] = useTransition();
  const [read, setRead] = useState(!unread);
  const [removed, setRemoved] = useState(false);
  const router = useRouter();

  const run = (
    action: (fd: FormData) => Promise<{ error?: string }>,
    after: (card: Element | null) => void,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const card = event.currentTarget.closest("li");
    const fd = new FormData();
    fd.set("id", id);

    start(async () => {
      const result = await action(fd);
      // Only act on the view if the server actually did it — otherwise the card
      // would change while the database had not.
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      after(card);
      router.refresh();
    });
  };

  if (removed) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-4 text-xs">
      {!read && (
        <button
          type="button"
          disabled={pending}
          onClick={(e) => run(markEnquiryRead, () => setRead(true), e)}
          className="text-admin-muted transition-colors hover:text-admin-accent disabled:opacity-50"
        >
          {pending ? "Working…" : "Mark as read"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm("Remove this enquiry?")) return;
          run(
            deleteEnquiry,
            (card) => {
              setRemoved(true);
              card?.setAttribute("hidden", "");
            },
            e,
          );
        }}
        className="text-admin-muted transition-colors hover:text-destructive disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
