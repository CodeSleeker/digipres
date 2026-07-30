-- ═══════════════════════════════════════════════════════════════════════════
-- 0023_business_favicon.sql
-- A dedicated browser-tab icon for the tenant's public site.
--
-- Separate from `logo_url` on purpose. A logo is usually WIDE (a wordmark, or a
-- mark plus the business name); scaled into a 16px tab it becomes an unreadable
-- smudge. Owners who have a square mark can supply it here.
--
-- Nullable, and read as the LAST resort in a chain (lib/tenant/icons.ts):
--   favicon_url → logo_url → a tile generated from the brand initial
-- so a tenant that sets nothing still gets its own icon rather than the
-- platform's.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists favicon_url text;

comment on column public.businesses.favicon_url is
  'Square browser-tab icon. Falls back to logo_url, then a generated initial tile.';

-- No RLS changes needed: the existing public-read and owner-update policies on
-- `businesses` already govern this column.
