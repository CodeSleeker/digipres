-- ═══════════════════════════════════════════════════════════════════════════
-- 0012_platform_read_access.sql
-- Let platform staff READ across tenants, for the super admin portal.
--
-- Deliberately ADDITIVE: these are NEW policies sitting alongside the existing
-- owner policies, which are not modified. Postgres OR's policies together, so
-- an owner's access is completely unchanged — the existing isolation tests hold
-- exactly as before, and this can be reverted by dropping these five policies.
--
-- SELECT ONLY. Platform staff cannot insert/update/delete tenant data with
-- these; acting on a tenant's behalf goes through audited impersonation, which
-- runs with the service-role client and writes to audit_log.
-- ═══════════════════════════════════════════════════════════════════════════

-- Businesses are already publicly readable when active; this additionally lets
-- staff see soft-deleted / suspended tenants.
create policy "Platform staff can read all businesses"
  on public.businesses for select to authenticated
  using (public.is_platform_admin());

create policy "Platform staff can read all customers"
  on public.customers for select to authenticated
  using (public.is_platform_admin());

create policy "Platform staff can read all appointments"
  on public.appointments for select to authenticated
  using (public.is_platform_admin());

create policy "Platform staff can read all review messages"
  on public.review_messages for select to authenticated
  using (public.is_platform_admin());

create policy "Platform staff can read all domains"
  on public.business_domains for select to authenticated
  using (public.is_platform_admin());
