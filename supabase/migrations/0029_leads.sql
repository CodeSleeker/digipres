-- ═══════════════════════════════════════════════════════════════════════════
-- 0029_leads.sql
-- Enquiries from the platform's OWN marketing page.
--
-- NO business_id, deliberately. Every other table here is tenant-owned and
-- carries one; a lead is the opposite — it arrives from a stranger on Aliamz
-- Digital's front door, before any business exists. Adding a nullable
-- business_id "just in case" would put a column on the table that is null for
-- every row and invite a tenant-scoped query that silently returns nothing.
--
-- WHY STORE THEM AT ALL, when the submission is also emailed and texted:
-- because both of those can fail silently. A bounced Resend send, an
-- unverified domain, a spam folder, a carrier rejecting the alert — in every
-- one of those cases the visitor was told "thanks, we'll be in touch" and the
-- enquiry would simply not exist. The row is what makes that recoverable.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Which form it came from. Text + check rather than an enum: this list will
  -- grow with the marketing site, and adding an enum value needs a migration
  -- that cannot run inside a transaction with other DDL on some Postgres
  -- versions.
  kind text not null default 'contact'
    check (kind in ('consultation', 'contact')),

  name  text not null check (length(trim(name)) between 1 and 120),
  email text not null check (length(trim(email)) between 3 and 254),
  phone text check (phone is null or length(trim(phone)) <= 32),

  /* Consultation only. Free text, not a slot: this is a REQUEST, not a booking
     against real availability, and pretending otherwise in the schema would
     imply a calendar that does not exist. */
  project_type    text check (project_type is null or length(project_type) <= 80),
  preferred_date  text check (preferred_date is null or length(preferred_date) <= 20),
  preferred_time  text check (preferred_time is null or length(preferred_time) <= 20),

  message text check (message is null or length(message) <= 4000),

  -- Triage state. 'new' until someone picks it up.
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed', 'spam')),

  -- Kept for rate-limit forensics and abuse review, nothing else.
  source_ip text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same trigger every other table uses, so `updated_at` means the same thing here.
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- The inbox view: newest first.
create index if not exists leads_created_at_idx
  on public.leads (created_at desc);

-- Triage view: open leads only.
create index if not exists leads_status_created_at_idx
  on public.leads (status, created_at desc);

alter table public.leads enable row level security;

/*
 * No INSERT policy, on purpose.
 *
 * The public form writes through the service-role client in the server action,
 * which bypasses RLS. Granting anon INSERT would open an unauthenticated write
 * endpoint on a table anyone could then flood directly, sidestepping the rate
 * limit, the honeypot and the validation that live in the action.
 *
 * Reads are platform staff only — a lead contains a stranger's name, email and
 * phone, and belongs to no tenant, so no owner should ever see one.
 */
drop policy if exists "Platform staff can read leads" on public.leads;
create policy "Platform staff can read leads"
  on public.leads for select
  using (public.is_platform_admin());

drop policy if exists "Platform staff can update leads" on public.leads;
create policy "Platform staff can update leads"
  on public.leads for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.leads is
  'Enquiries from the platform marketing site. Not tenant-owned: no business_id.';
