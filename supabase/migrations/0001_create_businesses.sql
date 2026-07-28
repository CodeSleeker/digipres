-- ═══════════════════════════════════════════════════════════════════════════
-- 0001_create_businesses.sql
-- The Business entity: one authenticated owner manages exactly one business.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Shared updated_at trigger ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Business category enum ─────────────────────────────────────────────────
-- Maps a business to its industry (and, later, its default template).
-- Extend with:  alter type public.business_category add value '<name>';
create type public.business_category as enum (
  'barber',
  'salon',
  'spa',
  'clinic',
  'dental',
  'construction',
  'restaurant',
  'cafe',
  'retail',
  'automotive',
  'fitness',
  'other'
);

-- ── businesses table ───────────────────────────────────────────────────────
create table public.businesses (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id) on delete cascade,

  name              text not null,
  slug              text not null,
  description       text,
  phone             text,
  email             text,
  address           text,
  logo_url          text,
  cover_image_url   text,
  category          public.business_category not null default 'other',
  owner_name        text,
  -- Weekly opening hours: array of { day: 0-6, closed, open, close }. See types/business-entity.ts
  hours             jsonb not null default '[]'::jsonb,
  google_review_url text,
  facebook_url      text,
  instagram_url     text,
  website_url       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz -- soft delete: null = active
);

-- One active business per owner (soft-deleted rows are ignored, so a slug/owner
-- can be reused after deletion).
create unique index businesses_owner_id_active_key
  on public.businesses (owner_id)
  where deleted_at is null;

-- Unique active slug (used to resolve the tenant from the host/dev slug).
create unique index businesses_slug_active_key
  on public.businesses (slug)
  where deleted_at is null;

-- Trigger to maintain updated_at.
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.businesses enable row level security;

-- Public websites are meant to be read by anyone, so anonymous + authenticated
-- clients may SELECT active businesses. Sensitive tenant data lives in other
-- tables with stricter policies.
create policy "Active businesses are publicly readable"
  on public.businesses
  for select
  using (deleted_at is null);

-- Only the owner may create their business, and only for themselves.
create policy "Owners can insert their own business"
  on public.businesses
  for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Only the owner may modify their (active) business. This also covers soft
-- deletes, which are UPDATEs that set deleted_at.
create policy "Owners can update their own business"
  on public.businesses
  for update
  to authenticated
  using (owner_id = auth.uid() and deleted_at is null)
  with check (owner_id = auth.uid());

-- NOTE: no DELETE policy on purpose — hard deletes are denied by RLS so records
-- can only be soft-deleted, preserving history.
