-- ═══════════════════════════════════════════════════════════════════════════
-- 0039_retreat_content.sql
-- The retreat template's own sections, made editable.
--
-- WHAT WAS WRONG. The retreat design has blocks with no counterpart on any
-- other template: an atmospheric image break, a strip about how a stay feels, a
-- brand statement, and several photographs that sit inside otherwise-editable
-- sections (the wide shot in "The Stay", the caption under the story, the
-- picture behind the booking CTA). Those were parked in a `retreat` namespace
-- on the rendered profile and served from the template default — visible on
-- every site, changeable on none. An owner could edit the four cards in "The
-- Stay" and not the photograph between them.
--
-- ONE COLUMN, NOT SIX. They are edited together, read together and belong to
-- one template. Splitting them into `experience_content`, `quote_content` and
-- the rest would put five template-specific sections in a catalogue every
-- template shares, and five entries in a navigation only one template's owners
-- would ever see.
--
-- NULL means "not customized", exactly as for the other *_content columns: the
-- site falls back to the template default, which is what every existing
-- retreat tenant is already showing.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists retreat_content jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes this column to the public site, and the owner update
-- policy already governs writes.
