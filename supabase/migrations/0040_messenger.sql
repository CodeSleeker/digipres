-- ═══════════════════════════════════════════════════════════════════════════
-- 0040_messenger.sql
-- Facebook Messenger conversations: the connected Page, the thread, the
-- transcript. Phase 1 of docs/messenger-ai.md.
--
-- THREE TABLES, NOT ONE. A Page is connected once and lives for years; a
-- conversation is per person and carries a state machine; a message is
-- immutable and arrives in volume. Collapsing them would mean either
-- rewriting the Page token on every message or losing the thread state that
-- makes slot filling possible.
--
-- TENANCY IS A CHECK CONSTRAINT, NOT A CONVENTION. Aliamz's own Page owns no
-- `businesses` row — its conversations become `leads`, exactly as the
-- marketing forms do (0029_leads.sql). A plain nullable `business_id` would
-- leave "platform Page" and "client Page whose link was lost" indistinguishable
-- in the data. `channel_kind` makes the two explicit and the constraint makes
-- them un-mixable.
--
-- PSIDs ARE PAGE-SCOPED. The same human has a different id on every Page, so
-- the uniqueness of a thread is (channel, psid) and never psid alone. Treating
-- a PSID as a person would merge two strangers the first time a client
-- connects a second Page.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── The connected Page ──────────────────────────────────────────────────────
create table if not exists public.messaging_channels (
  id uuid primary key default gen_random_uuid(),

  -- Meta's Page id. The webhook payload carries this as `entry[].id`, and it is
  -- the ONLY thing that decides which tenant a delivery belongs to — never
  -- message content. Same rule as host-based tenancy on the booking route.
  page_id   text not null unique check (length(trim(page_id)) between 1 and 64),
  page_name text check (page_name is null or length(page_name) <= 200),

  /* The Page Access Token, encrypted by the app (AES-256-GCM, see
     lib/messenger/token-crypto.ts) rather than by pgcrypto — the key then lives
     only in the environment, so a database dump is not sufficient to post as
     the client's business. Nullable because a channel row is useful before a
     token has been issued. */
  page_access_token_encrypted text,

  business_id uuid references public.businesses (id) on delete cascade,

  channel_kind text not null
    check (channel_kind in ('platform', 'tenant')),

  -- The whole point of the two-value kind: tenant ⟺ business_id.
  constraint messaging_channels_kind_matches_business
    check ((channel_kind = 'tenant') = (business_id is not null)),

  -- Off switch per Page. An owner who wants to answer their own Messenger for a
  -- week should not have to disconnect it.
  ai_enabled boolean not null default true,

  -- Tone, name, greeting. jsonb because this is presentation copy that will
  -- grow fields, not something to migrate a column for each time.
  persona jsonb not null default '{}'::jsonb,

  status text not null default 'active'
    check (status in ('active', 'paused', 'disconnected')),

  connected_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists messaging_channels_business_idx
  on public.messaging_channels (business_id)
  where business_id is not null;

-- ── The thread ──────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),

  channel_id uuid not null
    references public.messaging_channels (id) on delete cascade,

  psid text not null check (length(trim(psid)) between 1 and 64),

  state text not null default 'ai_active'
    check (state in ('ai_active', 'collecting', 'awaiting_confirm', 'human', 'closed')),

  intent text check (intent is null or length(intent) <= 40),

  -- The slot bag. Merged turn by turn until every required slot is present.
  collected jsonb not null default '{}'::jsonb,

  /* What this conversation produced — an appointment id, an enquiry id, a lead
     id. Text rather than a foreign key on purpose: the target table differs by
     channel kind, and three nullable FKs would be three ways to say one thing. */
  outcome_ref text check (outcome_ref is null or length(outcome_ref) <= 100),

  /* Drives Meta's 24-hour messaging window. A Page may only message someone
     within 24h of THEIR last message, so this is not a statistic — it is the
     value that decides whether a reply is allowed to be sent at all. */
  last_customer_message_at timestamptz,

  -- Cap on how long the AI may talk before a human is pulled in.
  ai_message_count integer not null default 0 check (ai_message_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One thread per person per Page. See the PSID note in the header.
  unique (channel_id, psid)
);

create index if not exists conversations_channel_recent_idx
  on public.conversations (channel_id, last_customer_message_at desc);

-- ── The transcript ──────────────────────────────────────────────────────────
create table if not exists public.messenger_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.conversations (id) on delete cascade,

  direction text not null check (direction in ('inbound', 'outbound')),

  /* Meta's message id, and the dedupe key.
   *
   * Webhooks ARE redelivered — on our timeout, on their retry, on a redeploy
   * mid-request — and the honest way to handle that is to let the database
   * refuse the duplicate rather than to check-then-insert in application code,
   * which races with itself under exactly the concurrency that causes retries.
   *
   * Nullable because an outbound message has no `mid` until Meta returns one,
   * and Postgres permits many NULLs under a unique constraint.
   */
  mid text unique check (mid is null or length(mid) <= 200),

  text    text check (text is null or length(text) <= 8000),
  payload jsonb,

  -- Populated for AI turns only; null for anything a human or a customer sent.
  ai_model   text check (ai_model is null or length(ai_model) <= 80),
  tokens     integer check (tokens is null or tokens >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),

  created_at timestamptz not null default now()
);

create index if not exists messenger_messages_conversation_idx
  on public.messenger_messages (conversation_id, created_at);

-- Supports the retention age scan.
create index if not exists messenger_messages_created_idx
  on public.messenger_messages (created_at);

-- ── updated_at, same trigger as everywhere else ─────────────────────────────
drop trigger if exists messaging_channels_set_updated_at on public.messaging_channels;
create trigger messaging_channels_set_updated_at
  before update on public.messaging_channels
  for each row execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
/*
 * READ-ONLY POLICIES, DELIBERATELY.
 *
 * Every write here comes from the webhook, which runs with the service role and
 * bypasses RLS entirely — the same shape as `leads`. Granting INSERT to anon or
 * authenticated would open a write path to a table holding other people's
 * private messages, reachable without the signature check that is the only
 * thing proving a delivery came from Meta.
 *
 * Owners read their own Page's threads. Platform-kind rows — Aliamz's own Page,
 * carrying conversations with strangers who are nobody's customer — are visible
 * to platform staff only, exactly as a lead is.
 */
alter table public.messaging_channels enable row level security;
alter table public.conversations       enable row level security;
alter table public.messenger_messages  enable row level security;

drop policy if exists "Read own or platform channels" on public.messaging_channels;
create policy "Read own or platform channels"
  on public.messaging_channels for select
  using (
    (channel_kind = 'tenant' and public.owns_business(business_id))
    or (channel_kind = 'platform' and public.is_platform_admin())
  );

drop policy if exists "Read own or platform conversations" on public.conversations;
create policy "Read own or platform conversations"
  on public.conversations for select
  using (
    exists (
      select 1
      from public.messaging_channels c
      where c.id = conversations.channel_id
        and (
          (c.channel_kind = 'tenant' and public.owns_business(c.business_id))
          or (c.channel_kind = 'platform' and public.is_platform_admin())
        )
    )
  );

drop policy if exists "Read own or platform messages" on public.messenger_messages;
create policy "Read own or platform messages"
  on public.messenger_messages for select
  using (
    exists (
      select 1
      from public.conversations v
      join public.messaging_channels c on c.id = v.channel_id
      where v.id = messenger_messages.conversation_id
        and (
          (c.channel_kind = 'tenant' and public.owns_business(c.business_id))
          or (c.channel_kind = 'platform' and public.is_platform_admin())
        )
    )
  );

comment on table public.messaging_channels is
  'One connected Facebook Page. channel_kind = tenant <-> business_id is not null.';
comment on table public.conversations is
  'One Messenger thread per (channel, PSID). PSIDs are page-scoped, never a cross-Page identity.';
comment on table public.messenger_messages is
  'Messenger transcript. mid is unique so redelivered webhooks are deduped by the database.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Retention (extends 0018_retention.sql)
--
-- These rows are OTHER PEOPLE'S PRIVATE MESSAGES — the most sensitive personal
-- data the platform stores. They join the purge on the day they are created,
-- not once someone notices, which is why this is in the same migration as the
-- tables themselves.
--
-- The function's return type changes, so it must be dropped rather than
-- replaced. The 4th parameter carries a default so an existing 3-argument call
-- still resolves while a deploy is in flight.
-- ═══════════════════════════════════════════════════════════════════════════
drop function if exists public.purge_expired_rows(integer, integer, integer);

create or replace function public.purge_expired_rows(
  p_message_days   integer default 90,
  p_job_run_days   integer default 90,
  p_audit_days     integer default 730,
  p_messenger_days integer default 90
)
returns table (
  messages_deleted   integer,
  job_runs_deleted   integer,
  audit_deleted      integer,
  messenger_deleted  integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_messages  integer := 0;
  v_jobs      integer := 0;
  v_audit     integer := 0;
  v_messenger integer := 0;
begin
  if p_message_days < 1 or p_job_run_days < 1 or p_audit_days < 1
     or p_messenger_days < 1 then
    raise exception 'retention windows must be >= 1 day';
  end if;

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

  /* Messages only — the conversation row is kept.
   *
   * It holds the outcome reference and the state that says what happened, in a
   * few hundred bytes, while the transcript is the bulk and the sensitive part.
   * Deleting the thread as well would sever a booking from the conversation
   * that produced it, which is the one thing you want months later when a
   * customer disputes what they were told. */
  with deleted as (
    delete from public.messenger_messages
    where created_at < now() - make_interval(days => p_messenger_days)
    returning 1
  )
  select count(*)::integer into v_messenger from deleted;

  return query select v_messages, v_jobs, v_audit, v_messenger;
end;
$$;

revoke execute on function
  public.purge_expired_rows(integer, integer, integer, integer)
  from public, authenticated, anon;

comment on function public.purge_expired_rows(integer, integer, integer, integer) is
  'Age-based retention purge for review_messages (terminal only), job_runs, audit_log and messenger_messages. SECURITY DEFINER so it can delete from the append-only audit_log; deletes strictly by age and is callable only by the service role.';
