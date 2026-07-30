-- ═══════════════════════════════════════════════════════════════════════════
-- 0024_bookings_realtime.sql
-- Live appointment updates in the dashboard.
--
-- Supabase Realtime only streams tables that are members of the
-- `supabase_realtime` publication — a table with RLS and policies still emits
-- nothing until it is added here.
--
-- SECURITY: adding a table to the publication does NOT bypass RLS. Realtime
-- applies the subscriber's own policies to every change before delivering it,
-- so an owner subscribed to `appointments` receives only rows their existing
-- "Owners can read their appointments" policy (0007) already allows. One tenant
-- can never see another tenant's bookings arrive.
--
-- REPLICA IDENTITY FULL is required for UPDATE/DELETE payloads to carry the old
-- row, which is what lets RLS be evaluated against it. Without it Postgres ships
-- only the primary key and Realtime has to drop the event. INSERTs (the case
-- this feature is built for) work either way; the setting is here so status
-- changes stream correctly too.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.appointments replica identity full;
alter table public.customers    replica identity full;

-- Idempotent: `alter publication … add table` errors if the table is already a
-- member, which would break a re-run of the migration.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'customers'
  ) then
    alter publication supabase_realtime add table public.customers;
  end if;
end
$$;
