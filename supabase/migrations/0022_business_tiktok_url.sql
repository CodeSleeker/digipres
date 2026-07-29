-- ═══════════════════════════════════════════════════════════════════════════
-- 0022_business_tiktok_url.sql
-- A TikTok profile URL for the business.
--
-- The barber template's footer has always had a TikTok slot (rendered as "TK"
-- beside FB and IG), but there was no column to fill it — so the only TikTok
-- icon a tenant could publish was the template's placeholder, pointing at "#".
-- With this column the icon renders when, and only when, the owner sets a link.
--
-- Feeds the footer icons, the contact SOCIALS card, and JSON-LD `sameAs`.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists tiktok_url text;

-- No RLS changes needed: the existing public-read and owner-update policies on
-- `businesses` already govern this column.
