"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomer } from "@/features/customers/actions";

export function DeleteCustomerButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${name}? They can be restored later.`)) {
          return;
        }
        const fd = new FormData();
        fd.set("id", id);
        start(async () => {
          await deleteCustomer(fd);
          router.refresh();
        });
      }}
      className="text-xs text-gray transition-colors hover:text-destructive disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
