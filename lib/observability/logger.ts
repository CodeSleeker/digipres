/**
 * Minimal structured logging + an optional error-forwarding seam — no SDK, no
 * dependency. Logs one JSON line per event (aggregator-friendly in Vercel logs)
 * and, when ERROR_WEBHOOK_URL is set, fire-and-forgets the payload to it (Slack
 * webhook, Logtail, a log drain, etc.). Swap in @sentry/nextjs here later if you
 * want full error tracking.
 */

type LogContext = Record<string, unknown>;

export function logError(error: unknown, context: LogContext = {}): void {
  const payload = {
    level: "error",
    time: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };
  console.error(JSON.stringify(payload));
  void forwardToSink(payload);
}

export function logInfo(message: string, context: LogContext = {}): void {
  console.info(
    JSON.stringify({
      level: "info",
      time: new Date().toISOString(),
      message,
      ...context,
    }),
  );
}

async function forwardToSink(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Observability must never crash the request that triggered it.
  }
}
