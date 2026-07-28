-- ═══════════════════════════════════════════════════════════════════════════
-- 0006_create_review_messages.sql
-- Review Automation message queue.
--
-- When an appointment is completed, three messages are queued for the customer:
--   thank_you       → send immediately
--   review_request  → send after 3 days
--   reminder        → send after a further 5 days (8 days total)
-- A scheduled processor sends due messages; failures retry with backoff; if the
-- customer reviews, remaining queued messages are cancelled. Recipient number,
-- name and body are snapshotted so sending needs no joins.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.review_message_step as enum (
  'thank_you',
  'review_request',
  'reminder'
);

create type public.review_message_status as enum (
  'queued',
  'sent',
  'delivered',
  'failed',
  'cancelled'
);

create table public.review_messages (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses (id) on delete cascade,
  customer_id         uuid not null references public.customers (id) on delete cascade,
  appointment_id      uuid references public.appointments (id) on delete set null,

  step                public.review_message_step not null,
  status              public.review_message_status not null default 'queued',
  body                text not null,
  to_mobile           text not null,
  customer_name       text not null,

  scheduled_at        timestamptz not null,
  sent_at             timestamptz,
  delivered_at        timestamptz,
  attempts            integer not null default 0,
  last_error          text,
  provider_message_id text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Processor: find due, queued messages quickly.
create index review_messages_due_idx
  on public.review_messages (scheduled_at)
  where status = 'queued';

create index review_messages_business_created_idx
  on public.review_messages (business_id, created_at desc);

create index review_messages_customer_idx
  on public.review_messages (customer_id);

create index review_messages_appointment_idx
  on public.review_messages (appointment_id);

create trigger review_messages_set_updated_at
  before update on public.review_messages
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Owner-scoped for the dashboard / owner-context sends. The scheduled processor
-- runs with the service-role key, which bypasses RLS to serve every tenant.
alter table public.review_messages enable row level security;

create policy "Owners can read their review messages"
  on public.review_messages
  for select
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Owners can insert their review messages"
  on public.review_messages
  for insert
  to authenticated
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Owners can update their review messages"
  on public.review_messages
  for update
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );
