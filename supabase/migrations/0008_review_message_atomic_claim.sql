-- ═══════════════════════════════════════════════════════════════════════════
-- 0008_review_message_atomic_claim.sql
-- Fix: the review-automation processor could DOUBLE-SEND an SMS.
--
-- Before, sending was: SELECT queued rows  →  send  →  mark 'sent', as separate
-- steps. Two overlapping runs (two cron ticks, a manual trigger racing the cron,
-- or the immediate send inside startForAppointment racing a tick) both SELECTed
-- the same queued row and both sent it.
--
-- This migration adds ATOMIC CLAIMING: a claim marks a row before it is sent, in
-- one indivisible UPDATE that uses `FOR UPDATE SKIP LOCKED` so concurrent callers
-- never pick the same row. A `claimed_at` timestamp (rather than a new enum
-- value — which can't be added and used in the same transaction) records the
-- claim and lets a crashed worker's stale claim be safely re-claimed.
-- ═══════════════════════════════════════════════════════════════════════════

-- When a row was picked up for sending (null = not currently claimed).
alter table public.review_messages
  add column if not exists claimed_at timestamptz;

-- ── Atomic claim function ──────────────────────────────────────────────────
-- Claims up to p_limit due, queued, un-claimed (or stale-claimed) messages and
-- returns them already marked. `FOR UPDATE SKIP LOCKED` guarantees that two
-- concurrent callers receive disjoint row sets, so a message is claimed — and
-- therefore sent — at most once.
--
-- SECURITY INVOKER (the default): RLS still applies. The scheduled processor
-- runs with the service-role key (bypasses RLS → serves every tenant); an
-- authenticated owner could only ever claim their own rows. This deliberately
-- does NOT use SECURITY DEFINER, which would let any caller claim every tenant's
-- messages.
create or replace function public.claim_due_review_messages(
  p_limit integer,
  p_now timestamptz
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
    order by c.scheduled_at asc
    for update skip locked
    limit greatest(coalesce(p_limit, 0), 0)
  )
  returning m.*;
$$;

comment on function public.claim_due_review_messages(integer, timestamptz) is
  'Atomically claim up to p_limit due queued review messages (FOR UPDATE SKIP LOCKED). Prevents concurrent double-send.';
