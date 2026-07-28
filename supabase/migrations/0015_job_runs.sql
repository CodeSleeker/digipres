-- ═══════════════════════════════════════════════════════════════════════════
-- 0015_job_runs.sql
-- A record of every scheduled-job execution.
--
-- Until now nothing recorded that the review-automation cron ran. A silently
-- dead scheduler looked exactly like "no messages were due" — the queue would
-- grow with nobody noticing. This makes the difference observable: the platform
-- health page can say when the processor last ran and what it did.
--
-- Written only by the service-role processor (no INSERT policy exists, and
-- service-role bypasses RLS); readable by platform staff.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.job_status as enum ('success', 'failed');

create table public.job_runs (
  id          uuid primary key default gen_random_uuid(),
  job         text not null,
  status      public.job_status not null,
  started_at  timestamptz not null,
  finished_at timestamptz not null default now(),

  processed   integer not null default 0,
  sent        integer not null default 0,
  failed      integer not null default 0,
  error       text,
  metadata    jsonb not null default '{}'::jsonb
);

create index job_runs_job_started_idx on public.job_runs (job, started_at desc);

alter table public.job_runs enable row level security;

create policy "Platform staff can read job runs"
  on public.job_runs for select to authenticated
  using (public.is_platform_admin());
