-- ═══════════════════════════════════════════════════════════════════════════
-- 0044_enquiry_booking_content.sql
-- The two forms get a menu each, and a column each.
--
-- WHAT WAS WRONG. Both lived inside `events_content` under one `inquiry` key,
-- edited from a single CMS entry called "Events" that also held the portfolio
-- cards, the event grid and the hero extras. An owner changing what their
-- booking form asks for had to find it under a menu about their photographs.
--
-- WHY TWO COLUMNS AND NOT ONE. The CMS maps one section to one column and
-- writes the whole value back (services/website-content-service.ts). Two menus
-- pointing at the same column would overwrite each other: saving the enquiry
-- form would wipe the booking form's copy, and the owner would see it only
-- when a visitor did.
--
-- NULL means "not customized", exactly as for the other *_content columns.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists enquiry_content jsonb,
  add column if not exists booking_content jsonb;

comment on column public.businesses.enquiry_content is
  'The enquiry form: its heading, the dropdowns it offers and what it says after sending.';
comment on column public.businesses.booking_content is
  'The consultation form. Absent means the site offers no booking, only enquiries.';

/*
 * Move what is already there.
 *
 * The booking half was stored as `inquiry.consultation` and already carries
 * its own labels, so it transplants whole. The enquiry half is everything
 * else under `inquiry`. A tenant still on the template default has a null
 * `events_content` and is untouched by all three statements.
 */
update public.businesses
set enquiry_content = (events_content -> 'inquiry') - 'consultation',
    booking_content = events_content -> 'inquiry' -> 'consultation'
where events_content ? 'inquiry';

update public.businesses
set events_content = events_content - 'inquiry'
where events_content ? 'inquiry';

-- No RLS changes: the existing policies already cover every column on this
-- table, and these are read by the public site like the rest.
