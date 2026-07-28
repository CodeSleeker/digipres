-- ═══════════════════════════════════════════════════════════════════════════
-- 0018_retention.sql
-- Three tables grow forever and nothing ever removes a row from them:
--
--   review_messages  one to three rows per completed appointment, per tenant
--   job_runs         one row per cron tick — ~35k/year at */15
--   audit_log        one row per staff action; now that every mutation during
--                    impersonation is recorded, this grows much faster
--
-- Unbounded growth is a slow problem: query plans degrade, backups swell, and
-- the personal data inside review_messages (mobile numbers, customer names) is
-- kept long after it serves any purpose — which is a data-protection issue, not
-- just a storage one.
--
-- Retention differs by table because the reason for keeping each differs:
--   • review_messages — operational. Terminal rows only; a QUEUED message is
--     never deleted regardless of age, or an undelivered SMS would vanish.
--   • job_runs        — observability. Only recent history is ever looked at.
--   • audit_log       — accountability. Kept far longer (default 2 years); this
--     is the record you need precisely when something went wrong months ago.
--
-- SECURITY DEFINER is required: audit_log is deliberately append-only (no UPDATE
-- or DELETE policy exists, for anyone). Rather than weaken that, purging is a
-- single narrow, owner-privileged function that can only delete BY AGE — it
-- takes no predicate on content, tenant or actor, so it cannot be used to erase
-- a specific entry. EXECUTE is revoked from tenants and staff alike; only the
-- service role (the scheduler) can call it.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.purge_expired_rows(
  p_message_days   integer default 90,
  p_job_run_days   integer default 90,
  p_audit_days     integer default 730
)
returns table (
  messages_deleted integer,
  job_runs_deleted integer,
  audit_deleted    integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_messages integer := 0;
  v_jobs     integer := 0;
  v_audit    integer := 0;
begin
  -- Guard against a caller passing 0/negative and wiping live data.
  if p_message_days < 1 or p_job_run_days < 1 or p_audit_days < 1 then
    raise exception 'retention windows must be >= 1 day';
  end if;

  -- Terminal states only. 'queued' rows are still owed to a customer.
  with deleted as (
    delete from public.review_messages
    where status in ('sent', 'delivered', 'failed', 'cancelled')
      and created_at < now() - make_interval(days => p_message_days)
    returning 1
  )
  select count(*)::integer into v_messages from deleted;

  with deleted as (
    delete from public.job_runs
    where started_at < now() - make_interval(days => p_job_run_days)
    returning 1
  )
  select count(*)::integer into v_jobs from deleted;

  with deleted as (
    delete from public.audit_log
    where created_at < now() - make_interval(days => p_audit_days)
    returning 1
  )
  select count(*)::integer into v_audit from deleted;

  return query select v_messages, v_jobs, v_audit;
end;
$$;

-- Only the scheduler may run this. Tenants and platform staff must not be able
-- to trigger a purge, and staff must not be able to erase their own audit trail.
revoke execute on function public.purge_expired_rows(integer, integer, integer)
  from public, authenticated, anon;

comment on function public.purge_expired_rows(integer, integer, integer) is
  'Age-based retention purge for review_messages (terminal only), job_runs and audit_log. SECURITY DEFINER so it can delete from the append-only audit_log; deletes strictly by age and is callable only by the service role.';

-- Supports the age scans above (audit_log/job_runs already have suitable indexes).
create index if not exists review_messages_status_created_idx
  on public.review_messages (status, created_at);
