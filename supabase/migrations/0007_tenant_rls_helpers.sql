-- ═══════════════════════════════════════════════════════════════════════════
-- 0007_tenant_rls_helpers.sql
-- Multi-tenancy hardening: centralize the tenant boundary used by every
-- private table's Row Level Security into ONE reusable function, then rewrite
-- the customers / appointments / review_messages policies to call it.
--
-- This is BEHAVIOR-PRESERVING. Each policy previously inlined the same subquery:
--     business_id in (select id from public.businesses where owner_id = auth.uid())
-- We replace that with public.owns_business(business_id). Same predicate, one
-- definition — so the tenant rule can never drift between tables, and future
-- tenant-owned tables just reuse the function.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tenant boundary function ───────────────────────────────────────────────
-- True when the current authenticated user owns the given (active) business.
-- STABLE + SECURITY INVOKER: it runs with the caller's rights and reads only
-- businesses, which are already publicly readable, so it grants no extra access.
create or replace function public.owns_business(bid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = bid
      and b.owner_id = auth.uid()
      and b.deleted_at is null
  );
$$;

comment on function public.owns_business(uuid) is
  'Tenant boundary for RLS: true if auth.uid() owns the active business bid.';

-- ── customers ──────────────────────────────────────────────────────────────
drop policy if exists "Owners can read their customers"   on public.customers;
drop policy if exists "Owners can insert their customers" on public.customers;
drop policy if exists "Owners can update their customers" on public.customers;

create policy "Owners can read their customers"
  on public.customers for select to authenticated
  using (public.owns_business(business_id));

create policy "Owners can insert their customers"
  on public.customers for insert to authenticated
  with check (public.owns_business(business_id));

create policy "Owners can update their customers"
  on public.customers for update to authenticated
  using (deleted_at is null and public.owns_business(business_id))
  with check (public.owns_business(business_id));

-- ── appointments ───────────────────────────────────────────────────────────
drop policy if exists "Owners can read their appointments"   on public.appointments;
drop policy if exists "Owners can insert their appointments" on public.appointments;
drop policy if exists "Owners can update their appointments" on public.appointments;

create policy "Owners can read their appointments"
  on public.appointments for select to authenticated
  using (public.owns_business(business_id));

create policy "Owners can insert their appointments"
  on public.appointments for insert to authenticated
  with check (public.owns_business(business_id));

create policy "Owners can update their appointments"
  on public.appointments for update to authenticated
  using (deleted_at is null and public.owns_business(business_id))
  with check (public.owns_business(business_id));

-- ── review_messages ────────────────────────────────────────────────────────
-- (no deleted_at column; the scheduled processor still uses the service-role
--  key, which bypasses RLS to serve every tenant.)
drop policy if exists "Owners can read their review messages"   on public.review_messages;
drop policy if exists "Owners can insert their review messages" on public.review_messages;
drop policy if exists "Owners can update their review messages" on public.review_messages;

create policy "Owners can read their review messages"
  on public.review_messages for select to authenticated
  using (public.owns_business(business_id));

create policy "Owners can insert their review messages"
  on public.review_messages for insert to authenticated
  with check (public.owns_business(business_id));

create policy "Owners can update their review messages"
  on public.review_messages for update to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
