-- ═══════════════════════════════════════════════════════════════════════════
-- 0013_business_template_status.sql
-- Which template/theme a tenant uses, and where it is in its lifecycle.
--
-- Until now the template was hardcoded in the render path, so every tenant got
-- the barber/luxury design. This records the CHOICE per business; the renderer
-- starts honouring it in the templates phase. Existing rows keep today's
-- behaviour via the defaults, so nothing changes visually.
--
-- The list of available templates lives in code (templates/registry.ts) because
-- the components do — a database table would only duplicate it. If per-template
-- metadata or enable-flags are needed later, a `templates` table can reference
-- these codes.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.business_status as enum (
  'draft',     -- created by platform staff, owner hasn't finished setup
  'active',    -- live
  'suspended'  -- withheld (non-payment, abuse, at owner's request)
);

alter table public.businesses
  add column if not exists template_code text not null default 'barber-luxury',
  add column if not exists theme_code    text not null default 'default',
  -- Existing tenants are live, so 'active' is the right default for them;
  -- platform-onboarded businesses are explicitly created as 'draft'.
  add column if not exists status public.business_status not null default 'active';

create index if not exists businesses_status_idx
  on public.businesses (status)
  where deleted_at is null;
