import { getPlatformHealth } from "@/features/platform/queries";
import {
  CRON_STALE_AFTER_MINUTES,
  RETENTION_STALE_AFTER_MINUTES,
  formatAge,
} from "@/lib/platform/health";
import { StatTile } from "../_components/stat-tile";
import type { PlatformHealth } from "@/types/platform";

/**
 * System health: is the scheduler alive, is the queue draining, and which
 * capabilities this environment actually has configured.
 */
/**
 * Says which of the two variable names was found and what the store did with
 * it, rather than naming one variable and leaving the rest to guesswork.
 *
 * Vercel renamed Edge Config to Global Config in July 2026: a store connected
 * today injects GLOBAL_CONFIG, older ones still supply EDGE_CONFIG. Both are
 * read, so seeing WHICH one was picked up is the fastest way to tell a naming
 * problem apart from a deployment that simply predates the variable.
 */
function edgeConfigHint(probe: PlatformHealth["edgeConfig"]): string {
  if (!probe.source) {
    return "Neither GLOBAL_CONFIG nor EDGE_CONFIG is set on this deployment — custom domains fall back to a database lookup. Note that adding the variable in Vercel only takes effect on the NEXT deployment.";
  }
  if (probe.reachable === false) {
    return `${probe.source} is set but the store did not answer: ${probe.error ?? "unknown error"}`;
  }
  const store = probe.storeId ?? "id could not be derived — set GLOBAL_CONFIG_ID";
  return `via ${probe.source} · store ${store} · ${probe.domainCount ?? 0} hostname${probe.domainCount === 1 ? "" : "s"} published`;
}

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
      "SMS_PROVIDER + TWILIO_* or PHILSMS_API_TOKEN — without one, messages are marked sent but never leave",
    ],
    [
      "Custom domains",
      health.domainProvisioningConfigured,
      "VERCEL_API_TOKEN / VERCEL_PROJECT_ID",
    ],
    [
      "Edge routing table",
      // Green only when the store ANSWERS. A set-but-broken connection used to
      // read as configured, which is the failure this row exists to catch.
      health.edgeConfig.reachable === true,
      edgeConfigHint(health.edgeConfig),
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
          value={formatAge(health.minutesSinceLastRun)}
          tone={health.cronStale ? "danger" : "default"}
          hint={
            health.cronStale
              ? `No run in over ${Math.round(CRON_STALE_AFTER_MINUTES / 60)}h — check the cron`
              : `Runs daily · last status: ${health.lastRun?.status ?? "—"}`
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
          value={formatAge(health.minutesSinceRetention)}
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
