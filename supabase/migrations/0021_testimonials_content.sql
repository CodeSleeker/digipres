-- ═══════════════════════════════════════════════════════════════════════════
-- 0021_testimonials_content.sql
-- Website CMS: make the testimonials section editable.
--
-- Until now this section rendered from the template's default content for EVERY
-- tenant, which meant a newly onboarded business published quotes and star
-- ratings attributed to named people who were never their customers. Owning the
-- content is the fix; NULL still means "not customized".
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists testimonials_content jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes this column to the public site, and the owner update
-- policy already governs writes.
