import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { JobRun, NewJobRun } from "@/types/platform";

type Row = Database["public"]["Tables"]["job_runs"]["Row"];

export const REVIEW_AUTOMATION_JOB = "review-automation";
export const RETENTION_JOB = "retention";

/**
 * Execution history for scheduled jobs.
 *
 * Written by the service-role processor (there is no INSERT policy — only
 * service-role can write); read by platform staff for the health page.
 */
export class JobRunRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async record(run: NewJobRun): Promise<void> {
    const { error } = await this.supabase.from("job_runs").insert({
      job: run.job,
      status: run.status,
      started_at: run.startedAt,
      processed: run.processed ?? 0,
      sent: run.sent ?? 0,
      failed: run.failed ?? 0,
      error: run.error ?? null,
    });
    if (error) throw error;
  }

  /** Most recent execution of a job, or null if it has never run. */
  async latest(job: string): Promise<JobRun | null> {
    const { data, error } = await this.supabase
      .from("job_runs")
      .select("*")
      .eq("job", job)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async recent(job: string, limit = 20): Promise<JobRun[]> {
    const { data, error } = await this.supabase
      .from("job_runs")
      .select("*")
      .eq("job", job)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toDomain);
  }
}

function toDomain(row: Row): JobRun {
  return {
    id: row.id,
    job: row.job,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    processed: row.processed,
    sent: row.sent,
    failed: row.failed,
    error: row.error,
  };
}
