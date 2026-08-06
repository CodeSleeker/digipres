"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { processDueNow, type ProcessNowResult } from "@/features/reviews/actions";

export function ProcessNowButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ProcessNowResult | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await processDueNow();
            setResult(res);
            router.refresh();
          })
        }
        className="rounded-none border-admin-line text-admin-fg hover:border-admin-accent hover:text-admin-accent"
      >
        {pending ? "Processing…" : "Process due now"}
      </Button>
      {result && !result.error && (
        <span className="text-sm text-admin-muted">
          Sent {result.sent}, failed {result.failed} of {result.processed}.
        </span>
      )}
      {result?.error && (
        <span className="text-sm text-destructive">{result.error}</span>
      )}
    </div>
  );
}
