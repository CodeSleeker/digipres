-- ═══════════════════════════════════════════════════════════════════════════
-- 0010_business_domains.sql
-- Data-driven host → business mapping for multi-tenant routing.
--
-- Four ways a tenant is reached, all resolving to the SAME business:
--   1. DEV_BUSINESS_SLUG      (local dev, apex `/`)
--   2. /s/<slug>              (internal renderer only)
--   3. <slug>.<root-domain>   (platform subdomain, derived from businesses.slug)
--   4. custom domains         (roniesbarber.com, www.roniesbarber.com, …) ← here
--
-- A business may own several hostnames (apex + www + extras). At most one is
-- `is_primary` — the canonical public URL; the others 301 to it, so `/s/<slug>`
-- is never a public URL.
--
-- SECURITY: only `verified = true` rows are ever routed, and `verified` is set
-- exclusively by a trusted server process (service-role) after the DNS check.
-- Owners can never self-verify — otherwise they could claim a hostname they
-- don't own. Enforced below with column-level GRANTs (RLS is row-level only).
-- ═══════════════════════════════════════════════════════════════════════════

create table public.business_domains (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses (id) on delete cascade,

  -- Normalized: lowercase, no scheme / port / path / trailing dot.
  hostname           text not null,
  is_primary         boolean not null default false,
  verified           boolean not null default false,
  -- DNS TXT challenge value (set server-side during provisioning).
  verification_token text,
  verified_at        timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint business_domains_hostname_format check (
    hostname = lower(hostname)
    and hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  )
);

-- A hostname maps to exactly one business (anti-hijack + deterministic routing).
create unique index business_domains_hostname_key
  on public.business_domains (hostname);

-- At most one primary hostname per business.
create unique index business_domains_primary_key
  on public.business_domains (business_id)
  where is_primary;

create index business_domains_business_idx
  on public.business_domains (business_id);

create trigger business_domains_set_updated_at
  before update on public.business_domains
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.business_domains enable row level security;

-- A live site's hostname is public routing info (like the businesses row), but
-- only once verified; unverified rows stay private to the owner.
create policy "Verified domains are publicly readable"
  on public.business_domains for select
  using (verified);

create policy "Owners can read their domains"
  on public.business_domains for select to authenticated
  using (public.owns_business(business_id));

-- Owners may add a hostname, but never pre-verified.
create policy "Owners can add their domains"
  on public.business_domains for insert to authenticated
  with check (public.owns_business(business_id) and verified = false);

create policy "Owners can update their domains"
  on public.business_domains for update to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "Owners can remove their domains"
  on public.business_domains for delete to authenticated
  using (public.owns_business(business_id));

-- Column-level privileges: RLS can't restrict COLUMNS, so grants do it. An owner
-- may only toggle `is_primary`; `verified` / `verified_at` / `verification_token`
-- are writable by service-role only (which bypasses RLS and these grants).
revoke update on public.business_domains from authenticated;
grant update (is_primary) on public.business_domains to authenticated;
