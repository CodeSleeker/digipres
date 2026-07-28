import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";
import { makeReviewAutomationService } from "@/features/reviews/service";
import { logError } from "@/lib/observability/logger";
import {
  JobRunRepository,
  REVIEW_AUTOMATION_JOB,
} from "@/repositories/job-run-repository";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Scheduled processor for the review automation queue. Point a cron at this
 * (e.g. Vercel Cron every few minutes) with `Authorization: Bearer $CRON_SECRET`.
 * Uses the service-role client to send due messages for ALL tenants.
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
    const result = await makeReviewAutomationService(supabase).processDue(
      startedAt,
      500,
      null, // every tenant — this is the platform-wide scheduler
    );

    // Record the run so a silently-dead scheduler is visible on the health page
    // rather than looking like "nothing was due".
    await jobRuns
      .record({
        job: REVIEW_AUTOMATION_JOB,
        status: "success",
        startedAt,
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
      })
      .catch((error) => logError(error, { scope: "cron:job-run" }));

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError(error, { scope: "cron:review-automation" });
    await jobRuns
      .record({
        job: REVIEW_AUTOMATION_JOB,
        status: "failed",
        startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .catch(() => {});
    return NextResponse.json({ error: "Processor failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
