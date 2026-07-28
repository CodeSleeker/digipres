import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";
import { logError } from "@/lib/observability/logger";
import {
  JobRunRepository,
  RETENTION_JOB,
} from "@/repositories/job-run-repository";
import { retentionWindows } from "@/lib/jobs/retention";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Nightly retention purge. Point a cron at this with
 * `Authorization: Bearer $CRON_SECRET`.
 *
 * The deletion itself lives in the database (`purge_expired_rows`, migration
 * 0018) because audit_log is append-only for every role — this route only
 * decides *when*, never *what*.
 */
async function handle(request: NextRequest) {
  const rl = rateLimit(`cron:${ipFromHeaders(request.headers)}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const supabase = createServiceClient();
  const jobRuns = new JobRunRepository(supabase);
  const windows = retentionWindows(process.env);

  try {
    const { data, error } = await supabase.rpc("purge_expired_rows", {
      p_message_days: windows.messageDays,
      p_job_run_days: windows.jobRunDays,
      p_audit_days: windows.auditDays,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const deleted =
      (row?.messages_deleted ?? 0) +
      (row?.job_runs_deleted ?? 0) +
      (row?.audit_deleted ?? 0);

    await jobRuns
      .record({
        job: RETENTION_JOB,
        status: "success",
        startedAt,
        processed: deleted,
      })
      .catch((e) => logError(e, { scope: "cron:job-run" }));

    return NextResponse.json({ ok: true, deleted, windows, ...row });
  } catch (error) {
    logError(error, { scope: "cron:retention" });
    await jobRuns
      .record({
        job: RETENTION_JOB,
        status: "failed",
        startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .catch(() => {});
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
