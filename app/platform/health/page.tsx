import { getPlatformHealth } from "@/features/platform/queries";
import {
  CRON_STALE_AFTER_MINUTES,
  RETENTION_STALE_AFTER_MINUTES,
} from "@/lib/platform/health";
import { StatTile } from "../_components/stat-tile";

/**
 * System health: is the scheduler alive, is the queue draining, and which
 * capabilities this environment actually has configured.
 */
export default async function PlatformHealthPage() {
  const health = await getPlatformHealth();

  const capabilities: [string, boolean, string][] = [
    [
      "Scheduler secret",
      health.cronSecretConfigured,
      "CRON_SECRET — without it the cron route rejects every call",
    ],
    [
      "SMS carrier",
      health.smsConfigured,
      "TWILIO_* — without it messages are marked sent but never leave",
    ],
    [
      "Custom domains",
      health.domainProvisioningConfigured,
      "VERCEL_API_TOKEN / VERCEL_PROJECT_ID",
    ],
    [
      "Edge routing table",
      health.edgeConfigConfigured,
      "EDGE_CONFIG — custom domains resolve via the database fallback without it",
    ],
  ];

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-heading text-2xl tracking-[2px]">System Health</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray">
          Review automation runs on a schedule. If the processor stops, the
          queue grows silently — this page makes that visible.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Last processor run"
          value={
            health.minutesSinceLastRun === null
              ? "Never"
              : `${health.minutesSinceLastRun}m ago`
          }
          tone={health.cronStale ? "danger" : "default"}
          hint={
            health.cronStale
              ? `No run in over ${CRON_STALE_AFTER_MINUTES} minutes — check the cron`
              : `Last status: ${health.lastRun?.status ?? "—"}`
          }
        />
        <StatTile
          label="Queued messages"
          value={health.queued}
          tone={
            health.queued > 0 && health.cronStale
              ? "danger"
              : health.queued > 0
                ? "warn"
                : "default"
          }
          hint={
            health.oldestQueuedAt
              ? `Oldest due ${new Date(health.oldestQueuedAt).toLocaleString()}`
              : "Queue is empty"
          }
        />
        <StatTile
          label="Failed messages"
          value={health.failedMessages}
          tone={health.failedMessages > 0 ? "danger" : "default"}
          hint="Exhausted all retries"
        />
        <StatTile
          label="Last retention purge"
          value={
            health.minutesSinceRetention === null
              ? "Never"
              : `${Math.floor(health.minutesSinceRetention / 60)}h ago`
          }
          // Nightly job; a day and a half without one means it stopped.
          tone={
            health.minutesSinceRetention === null ||
            health.minutesSinceRetention > RETENTION_STALE_AFTER_MINUTES
              ? "warn"
              : "default"
          }
          hint={
            health.retentionLastRun
              ? `${health.retentionLastRun.processed} rows removed · ${health.retentionLastRun.status}`
              : "Nightly purge has not run — tables grow unbounded"
          }
        />
      </section>

      {health.lastRun && (
        <section>
          <h2 className="mb-3 font-heading text-lg tracking-[2px]">
            Last run detail
          </h2>
          <div className="border border-dark-border bg-dark p-5 text-sm text-gray-light">
            <p>
              {new Date(health.lastRun.startedAt).toLocaleString()} —{" "}
              <span
                className={
                  health.lastRun.status === "success"
                    ? "text-[#6cbf84]"
                    : "text-[#c1666b]"
                }
              >
                {health.lastRun.status}
              </span>
            </p>
            <p className="mt-2 text-xs text-gray">
              Processed {health.lastRun.processed} · sent {health.lastRun.sent}{" "}
              · failed {health.lastRun.failed}
            </p>
            {health.lastRun.error && (
              <p className="mt-2 text-xs text-destructive">
                {health.lastRun.error}
              </p>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-heading text-lg tracking-[2px]">
          Environment capabilities
        </h2>
        <ul className="grid gap-2">
          {capabilities.map(([name, ok, hint]) => (
            <li
              key={name}
              className="flex flex-wrap items-center gap-3 border border-dark-border bg-dark px-4 py-3 text-sm"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-[#6cbf84]" : "bg-[#d8b26a]"}`}
                aria-hidden="true"
              />
              <span className="text-white">{name}</span>
              <span className="text-xs text-gray">{hint}</span>
              <span
                className={`ml-auto text-xs uppercase tracking-[1px] ${ok ? "text-[#6cbf84]" : "text-[#d8b26a]"}`}
              >
                {ok ? "Configured" : "Not set"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
