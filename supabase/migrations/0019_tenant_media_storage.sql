-- ═══════════════════════════════════════════════════════════════════════════
-- 0019_tenant_media_storage.sql
-- Per-tenant media uploads (first use: the hero scroll-scrub video).
--
-- Until now every image in the CMS was a URL the owner pasted in — there was no
-- upload path at all. This adds one bucket with the same tenancy rule the rest
-- of the schema uses: an owner may write ONLY under their own business id.
--
-- Object key convention:   <business_id>/hero/<filename>
--
-- Reads are public: these are assets on a public website, and the bucket holds
-- nothing private. Writes are owner-scoped via public.owns_business(), so this
-- inherits the isolation guarantees already proven for every other table.
-- ═══════════════════════════════════════════════════════════════════════════

-- Cast that yields NULL instead of raising on a malformed key. Without it, an
-- object whose first path segment isn't a UUID would make the policy ERROR
-- rather than simply deny.
create or replace function public.uuid_or_null(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception
  when others then
    return null;
end;
$$;

comment on function public.uuid_or_null(text) is
  'Safe text→uuid cast (NULL on failure), so storage policies deny rather than error on a malformed object key.';

-- The `storage` schema only exists on a real Supabase project. The DB-level RLS
-- test harness builds a bare Postgres with just auth+public, so guard the whole
-- block — it must be a no-op there rather than failing the migration chain.
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema absent (local test harness) — skipping 0019';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('tenant-media', 'tenant-media', true)
  on conflict (id) do nothing;

  -- Public read: the files are served on public tenant websites.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Tenant media is publicly readable'
  ) then
    create policy "Tenant media is publicly readable"
      on storage.objects for select
      using (bucket_id = 'tenant-media');
  end if;

  -- Writes are scoped to the owner's own business folder.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Owners upload into their own business folder'
  ) then
    create policy "Owners upload into their own business folder"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'tenant-media'
        and public.owns_business(
          public.uuid_or_null((storage.foldername(name))[1])
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Owners replace their own media'
  ) then
    create policy "Owners replace their own media"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'tenant-media'
        and public.owns_business(
          public.uuid_or_null((storage.foldername(name))[1])
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Owners delete their own media'
  ) then
    create policy "Owners delete their own media"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'tenant-media'
        and public.owns_business(
          public.uuid_or_null((storage.foldername(name))[1])
        )
      );
  end if;
end $$;
