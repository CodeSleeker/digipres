-- ═══════════════════════════════════════════════════════════════════════════
-- 0017_claim_due_scoped_to_business.sql
-- Fix: the manual "process due now" action could send OTHER tenants' SMS.
--
-- 0008 made claiming atomic and reasoned about authorization like this:
--
--     "the scheduled processor runs with the service-role key (bypasses RLS →
--      serves every tenant); an authenticated owner could only ever claim their
--      own rows."
--
-- Impersonation invalidated the second half. When platform staff act as a
-- client, the back office runs on the SERVICE-ROLE client so it can reach that
-- client's rows — which means the owner-facing action no longer runs under RLS.
-- A staff member clicking "Process due now" inside one client's back office
-- would claim and send every tenant's queued messages.
--
-- The function stays SECURITY INVOKER (making it DEFINER would hand every
-- caller the whole queue). It gains an OPTIONAL business filter instead: the
-- cron passes null and serves everyone, while anything acting for a single
-- tenant passes that tenant's id and can only ever touch its own rows.
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the two-argument version so the new one is not an ambiguous overload.
drop function if exists public.claim_due_review_messages(integer, timestamptz);

create function public.claim_due_review_messages(
  p_limit integer,
  p_now timestamptz,
  p_business_id uuid default null
)
returns setof public.review_messages
language sql
security invoker
set search_path = public
as $$
  update public.review_messages m
  set claimed_at = now(),
      updated_at = now()
  where m.id in (
    select c.id
    from public.review_messages c
    where c.status = 'queued'
      and c.scheduled_at <= p_now
      and (c.claimed_at is null or c.claimed_at < now() - interval '10 minutes')
      -- null = every tenant (the cron); otherwise exactly one.
      and (p_business_id is null or c.business_id = p_business_id)
    order by c.scheduled_at asc
    for update skip locked
    limit greatest(coalesce(p_limit, 0), 0)
  )
  returning m.*;
$$;

comment on function public.claim_due_review_messages(integer, timestamptz, uuid) is
  'Atomically claim up to p_limit due queued review messages (FOR UPDATE SKIP LOCKED). Prevents concurrent double-send. p_business_id null = all tenants (scheduler); otherwise scoped to one tenant.';
