-- ═══════════════════════════════════════════════════════════════════════════
-- 0011_platform_roles_audit.sql
-- Platform (super admin) roles + an append-only audit log.
--
-- Until now every authenticated user was a tenant owner; there was no concept of
-- platform staff. This adds that role WITHOUT touching any existing tenant
-- policy — tenant isolation is unchanged and still provable by the existing
-- RLS tests. Cross-tenant access is introduced later, deliberately, on top of
-- this foundation.
--
-- BOOTSTRAP: no platform admin exists yet, and only a super_admin may create
-- one, so the first row must be inserted with the service-role key (Supabase
-- SQL editor):
--   insert into public.platform_admins (user_id, role)
--   values ('<auth.users.id>', 'super_admin');
-- ═══════════════════════════════════════════════════════════════════════════

create type public.platform_role as enum (
  'super_admin', -- full control, incl. managing platform staff
  'support',     -- day-to-day assistance across tenants
  'read_only'    -- visibility without mutation
);

create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.platform_role not null default 'support',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger platform_admins_set_updated_at
  before update on public.platform_admins
  for each row execute function public.set_updated_at();

-- ── Role helpers ───────────────────────────────────────────────────────────
-- SECURITY DEFINER is deliberate here:
--   * policies on OTHER tables can call it without being granted read on this one
--   * it avoids RLS recursion — an invoker-rights function reading
--     platform_admins from a policy ON platform_admins would loop
-- It is safe: it accepts no user input and reports only on the CURRENT caller.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = auth.uid()
  );
$$;

create or replace function public.current_platform_role()
returns public.platform_role
language sql
stable
security definer
set search_path = public
as $$
  select a.role from public.platform_admins a where a.user_id = auth.uid();
$$;

comment on function public.is_platform_admin() is
  'True when the current user is platform staff (any role).';
comment on function public.current_platform_role() is
  'The caller''s platform role, or null when they are not platform staff.';

-- ── RLS: platform_admins ───────────────────────────────────────────────────
alter table public.platform_admins enable row level security;

-- Staff can see the roster; anyone else can only ever see their own row (which
-- for a normal tenant owner is none) — so the roster is not enumerable.
create policy "Platform staff can read the roster"
  on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- Only a super_admin may grant/revoke platform access. This is the
-- privilege-escalation boundary: a tenant owner can never insert themselves.
create policy "Super admins manage platform staff"
  on public.platform_admins for all to authenticated
  using (public.current_platform_role() = 'super_admin')
  with check (public.current_platform_role() = 'super_admin');

-- ── Audit log ──────────────────────────────────────────────────────────────
-- Append-only record of platform actions. Essential once staff can act on a
-- tenant's behalf: every cross-tenant action must be attributable.
create table public.audit_log (
  id                 uuid primary key default gen_random_uuid(),
  actor_user_id      uuid references auth.users (id) on delete set null,
  -- The tenant the action was performed against (null for platform-wide acts).
  acting_business_id uuid references public.businesses (id) on delete set null,
  action             text not null,
  entity             text,
  entity_id          uuid,
  metadata           jsonb not null default '{}'::jsonb,
  ip                 text,
  created_at         timestamptz not null default now()
);

create index audit_log_created_idx  on public.audit_log (created_at desc);
create index audit_log_business_idx on public.audit_log (acting_business_id, created_at desc);
create index audit_log_actor_idx    on public.audit_log (actor_user_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "Platform staff can read the audit log"
  on public.audit_log for select to authenticated
  using (public.is_platform_admin());

create policy "Platform staff can append to the audit log"
  on public.audit_log for insert to authenticated
  with check (public.is_platform_admin());

-- No UPDATE or DELETE policies, on purpose: the audit log is append-only.
