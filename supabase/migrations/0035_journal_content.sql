-- ═══════════════════════════════════════════════════════════════════════════
-- 0035_journal_content.sql
-- Website CMS: a dated journal section.
--
-- Every other section is evergreen copy — what the business IS. This is the
-- first one that carries what is happening NOW: a note about the season, the
-- last guests, a change to the house. It is the only part of the site an owner
-- has a reason to open every few weeks, which matters beyond the page itself:
-- a site that visibly changes is one an answer engine has a reason to re-read.
--
-- Entries carry a date, a title, a body and up to four photographs with their
-- own captions. Stored as one JSONB document rather than a `journal_entries`
-- table, matching every other section: it is edited as a whole, read as a
-- whole, and never queried across tenants. A table would buy ordering and
-- pagination that nothing here asks for.
--
-- NULL means "not customized", exactly as for the other *_content columns.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists journal_content jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes this column to the public site, and the owner update
-- policy already governs writes.
