-- ═══════════════════════════════════════════════════════════════════════════
-- 0002_add_business_content.sql
-- Website CMS: editable per-section content stored on the businesses row.
--
-- Each column holds one editable section's content as JSONB. NULL means "not
-- customized" — the public site falls back to the template's default content
-- for that section. Contact/Footer intentionally store only section-specific
-- extras; phone/address/hours/socials continue to live in their scalar columns
-- and are merged in when the profile is built.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists hero_content     jsonb,
  add column if not exists about_content    jsonb,
  add column if not exists services_content jsonb,
  add column if not exists gallery_content  jsonb,
  add column if not exists contact_content  jsonb,
  add column if not exists footer_content   jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes these columns to the public site, and the owner
-- update policy already governs writes.
