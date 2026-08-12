-- ═══════════════════════════════════════════════════════════════════════════
-- 0038_business_coordinates.sql
-- Where the business actually is, as a point on the earth.
--
-- The last field the AI-visibility score docks EVERY tenant on: the check has
-- always been there (services/visibility-service.ts) and has always failed,
-- because the business entity had nowhere to put a coordinate. An address is
-- a string that a machine must geocode and may get wrong; a latitude and
-- longitude is the answer to "where is this" with nothing left to interpret,
-- which is why schema.org LocalBusiness has `geo` and why map embeds want a
-- point rather than a street line.
--
-- REAL COLUMNS, not JSONB — unlike lodging_details (0037). Every category has a
-- location, so these are as cross-cutting as `phone`: a barber, a bakery and a
-- retreat all want them, and a column is what makes them queryable if a
-- "places near me" feature ever needs a bounding box.
--
-- numeric(9,6): three digits before the point covers ±180, six after is about
-- 11cm at the equator — far past what any owner can supply by pasting a map
-- link, and exact enough that the stored value never has to be re-rounded.
--
-- BOTH OR NEITHER. A latitude without a longitude describes a line around the
-- planet, not a place. The constraint makes the half-filled state unstorable
-- rather than leaving every reader to check for it.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists latitude  numeric(9,6),
  add column if not exists longitude numeric(9,6);

alter table public.businesses
  drop constraint if exists businesses_coordinates_valid;

alter table public.businesses
  add constraint businesses_coordinates_valid check (
    (latitude is null and longitude is null)
    or (
      latitude between -90 and 90
      and longitude between -180 and 180
    )
  );

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes these columns to the public site, and the owner update
-- policy already governs writes.
