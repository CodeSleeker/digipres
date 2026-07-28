-- ═══════════════════════════════════════════════════════════════════════════
-- 0004_create_customers.sql
-- Customer Management: tenant-owned CRM records, one business → many customers.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.customer_review_status as enum (
  'pending',
  'requested',
  'received'
);

create type public.customer_sms_status as enum (
  'not_sent',
  'sent',
  'failed',
  'opted_out'
);

create table public.customers (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,

  name             text not null,
  mobile           text,
  email            text,
  address          text,
  last_visit       date,
  preferred_staff  text,
  services_availed text[] not null default '{}',
  notes            text,
  review_status    public.customer_review_status not null default 'pending',
  sms_status       public.customer_sms_status not null default 'not_sent',

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz -- soft delete: null = active
);

-- Tenant-scoped lookups + default ordering, ignoring soft-deleted rows.
create index customers_business_id_idx
  on public.customers (business_id)
  where deleted_at is null;

create index customers_business_created_idx
  on public.customers (business_id, created_at desc)
  where deleted_at is null;

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Customers are PRIVATE: only the owner of the parent business may access them.
alter table public.customers enable row level security;

create policy "Owners can read their customers"
  on public.customers
  for select
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Owners can insert their customers"
  on public.customers
  for insert
  to authenticated
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Owners can update their customers"
  on public.customers
  for update
  to authenticated
  using (
    deleted_at is null
    and business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- No DELETE policy: hard deletes are denied, so records are only soft-deleted.
