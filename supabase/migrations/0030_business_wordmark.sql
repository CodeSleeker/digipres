-- ═══════════════════════════════════════════════════════════════════════════
-- 0030_business_wordmark.sql
-- An optional image for the business NAME in the site header.
--
-- Until now the header has been: uploaded mark (or a generated initial tile),
-- plus the business name rendered as TEXT. That works for most tenants, but it
-- fails two real cases:
--
--   1. A brand whose name is set in a specific typeface. Re-typing it in the
--      template's font is visibly not their logo.
--   2. A logo supplied as a single LOCKUP — mark and name already combined in
--      one image. Uploading that as `logo_url` renders the name twice, once in
--      the picture and once as text beside it.
--
-- With this column both are expressible, and the four combinations cover every
-- tenant without another setting:
--
--   logo only          mark image + name as text        (unchanged, the default)
--   wordmark only      one image, no text               (the lockup case)
--   both               mark image + wordmark image
--   neither            initial tile + name as text
--
-- ACCESSIBILITY: when the name becomes an image it stops being text in the DOM,
-- so the template gives that image a real `alt` of the business name instead of
-- the empty alt the decorative mark carries. The name is never absent from the
-- accessible tree, whichever combination a tenant chooses.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists wordmark_url text;

comment on column public.businesses.wordmark_url is
  'Optional image of the business name for the site header. Replaces the text wordmark when set. See migration 0030 for the four logo/wordmark combinations.';
