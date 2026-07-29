-- ═══════════════════════════════════════════════════════════════════════════
-- 0020_barbers_products_content.sql
-- Website CMS: make the team ("barbers") and shop ("products") sections
-- editable, the same way 0002 did for hero/about/services/gallery/contact/footer.
--
-- NULL means "not customized" — the public site falls back to the template's
-- default content for that section, so existing tenants are unaffected.
--
-- Not every template renders these sections; which ones a tenant may edit is
-- declared per template in templates/registry.ts, not stored here. Keeping that
-- in code means the column set stays uniform and a template gaining a section
-- needs no migration.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists barbers_content  jsonb,
  add column if not exists products_content jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes these columns to the public site, and the owner
-- update policy already governs writes.
