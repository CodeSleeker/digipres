-- ═══════════════════════════════════════════════════════════════════════════
-- 0005_create_appointments.sql
-- Appointments: tenant-owned scheduling records, one business → many.
-- When an appointment becomes 'completed' the app triggers the review
-- automation workflow (see services/review-automation-service.ts).
-- ═══════════════════════════════════════════════════════════════════════════

create type public.appointment_status as enum (
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

create table public.appointments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Keep the appointment if the customer record is removed.
  customer_id uuid references public.customers (id) on delete set null,

  service     text,
  staff       text,
  status      public.appointment_status not null default 'scheduled',
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz -- soft delete: null = active
);

-- Calendar/list ordering + tenant scoping, ignoring soft-deleted rows.
create index appointments_business_starts_idx
  on public.appointments (business_id, starts_at)
  where deleted_at is null;

create index appointments_customer_idx
  on public.appointments (customer_id)
  where deleted_at is null;

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.appointments enable row level security;

create policy "Owners can read their appointments"
  on public.appointments
  for select
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Owners can insert their appointments"
  on public.appointments
  for insert
  to authenticated
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Owners can update their appointments"
  on public.appointments
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

-- No DELETE policy: records are only soft-deleted.
