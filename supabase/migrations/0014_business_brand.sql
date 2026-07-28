-- ═══════════════════════════════════════════════════════════════════════════
-- 0014_business_brand.sql
-- Per-tenant brand wordmark.
--
-- The logo ("RONIE'S / BARBER / R") currently lives in the template's default
-- profile, so a SECOND barber would inherit the first one's branding. This moves
-- it into the tenant's own row.
--
-- Nullable on purpose — when unset the brand is derived from the business name
-- (e.g. "Ronies Barber" → RONIES / BARBER / R), which is right far more often
-- than the template default. Explicit values here override that.
--
-- Shape: { "namePrimary": "RONIES", "nameAccent": "BARBER", "initial": "R" }
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists brand jsonb;

comment on column public.businesses.brand is
  'Optional wordmark override { namePrimary, nameAccent, initial }. Derived from the business name when null.';
