import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";
import { DigestService } from "@/services/digest-service";
import { logError } from "@/lib/observability/logger";
import { JobRunRepository } from "@/repositories/job-run-repository";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/** The job name recorded in `job_runs`, for the health page. */
export const SUBSCRIBER_DIGEST_JOB = "subscriber-digest";

/**
 * The weekly digest, for every tenant cleared to send.
 *
 * Point a cron at this with `Authorization: Bearer $CRON_SECRET`. Runs as
 * service-role because it works across all tenants — the owner policies would
 * narrow it to nothing.
 *
 * SKIPS QUIETLY. A business with no new creations since its last digest is
 * passed over without sending and without recording a run, so its window stays
 * open and this week's bake is still news whenever it is written up. A weekly
 * email that says "nothing new" is how a list teaches people to ignore it.
 *
 * The run is recorded either way so that a scheduler that has silently died is
 * visible on the health page rather than looking like "nothing was due" — the
 * exact failure the review-automation job records against.
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

  try {
    const result = await new DigestService(supabase).run();

    await jobRuns.record({
      job: SUBSCRIBER_DIGEST_JOB,
      status: "success",
      startedAt,
      processed: result.businessesConsidered,
      sent: result.emailsSent,
      failed: result.emailsFailed,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError(error, { scope: "jobs:subscriber-digest" });
    await jobRuns
      .record({
        job: SUBSCRIBER_DIGEST_JOB,
        status: "failed",
        startedAt,
        processed: 0,
        failed: 0,
        error: "unhandled",
      })
      // A failure recording the failure must not mask the failure.
      .catch(() => undefined);
    return NextResponse.json({ error: "Digest run failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
