"use client";

import { useEffect, useState } from "react";

/**
 * A confirmation that clears itself.
 *
 * "Saved — changes are live" is only meaningful for a moment. Left on screen it
 * becomes furniture: the next time the owner saves, the message is already
 * there, so nothing visibly happens and they can't tell whether the click
 * registered. Clearing it means the next save produces a real change again.
 *
 * ERRORS ARE NOT SHOWN THIS WAY — they must stay until read and acted on.
 */
const DISMISS_MS = 3000;

export function SavedNotice({
  /**
   * A value that changes on each save — the result object from the action is
   * ideal, since a new one is returned every time. Null or undefined means
   * nothing to show.
   */
  token,
  children,
}: {
  token: unknown;
  children: React.ReactNode;
}) {
  // Which token has already had its time on screen. Storing the token rather
  // than a boolean is what makes a repeat save re-show the message: the new
  // token hasn't been dismissed yet, so it is visible again without any reset.
  const [dismissed, setDismissed] = useState<unknown>(null);

  useEffect(() => {
    if (token == null) return;
    const timer = setTimeout(() => setDismissed(token), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [token]);

  if (token == null || dismissed === token) return null;

  return (
    <span role="status" aria-live="polite" className="text-sm text-[#5bbf7b]">
      {children}
    </span>
  );
}
