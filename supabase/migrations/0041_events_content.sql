-- ═══════════════════════════════════════════════════════════════════════════
-- 0041_events_content.sql
-- The events template's own sections, made editable.
--
-- WHAT WAS WRONG. The events design is led by two blocks with no counterpart
-- on any other template: the three category cards under the hero, and the
-- filterable grid of events actually styled. They were parked in an `events`
-- namespace on the rendered profile and served from the template default —
-- visible on every site, changeable on none.
--
-- That gap is worse here than it was for the retreat. An event stylist's
-- portfolio is the part of their site that changes MOST: a wedding is styled,
-- photographed, and should appear that month. An owner who cannot add one is
-- left with a permanent showcase of six events they did not do.
--
-- The same column also carries the approach panel (with its three figures) and
-- the enquiry form's own dropdowns — the event types, budget bands and service
-- checkboxes. Those are per-studio choices: a stylist who does not take
-- corporate work should not have "Corporate event" in their own form.
--
-- ONE COLUMN, NOT FOUR. Same reasoning as 0039: they are edited together, read
-- together and belong to one template. Splitting them into `portfolio_content`,
-- `showcase_content` and the rest would put four template-specific sections in
-- a catalogue every template shares, and four entries in a navigation only one
-- template's owners would ever see.
--
-- NULL means "not customized", exactly as for the other *_content columns: the
-- site falls back to the template default, which is what the first events
-- tenant is already showing.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists events_content jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes this column to the public site, and the owner update
-- policy already governs writes.
