-- ═══════════════════════════════════════════════════════════════════════════
-- 0031_faq_content.sql
-- Website CMS: an editable FAQ section.
--
-- Question/answer pairs are the highest-value remaining AI-visibility item: an
-- answer engine can quote them directly, which prose buried in an About
-- paragraph does not allow. They also feed FAQPage JSON-LD.
--
-- NULL means "not customized", exactly as for the other *_content columns.
-- Unlike those, the template default carries NO items: an invented answer
-- ("Yes, we accept walk-ins") is a factual claim about a real business, and
-- Google's structured-data policy requires FAQ markup to match content actually
-- visible on the page. So an un-customized tenant renders no section and emits
-- no FAQ schema.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists faq_content jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes this column to the public site, and the owner update
-- policy already governs writes.
