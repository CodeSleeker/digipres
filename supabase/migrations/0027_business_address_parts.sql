-- ═══════════════════════════════════════════════════════════════════════════
-- 0027_business_address_parts.sql
-- Machine-readable address components.
--
-- `address` was one free-text blob, and lib/seo/json-ld.ts had nowhere to put
-- it but `streetAddress`. Nothing then said which CITY the business was in —
-- so a search engine or an AI assistant answering "barber in Cagayan de Oro"
-- had to infer the locality from prose, which it cannot do reliably. That is a
-- bigger gap than the missing coordinates: Google takes coordinates from the
-- verified Business Profile anyway, but the locality is what makes the page
-- itself resolvable to a place.
--
-- `address` KEEPS ITS MEANING as the street line and is not renamed, so nothing
-- reading it breaks. Existing rows hold a full address there; that still
-- renders and still emits as `streetAddress`, it is simply not split. No
-- backfill is attempted — parsing free-text addresses is guesswork, and a
-- wrong locality is worse than none.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists address_locality    text,
  add column if not exists address_region      text,
  add column if not exists address_postal_code text,
  add column if not exists address_country     text;

comment on column public.businesses.address is
  'Street line only. The remaining components are the address_* columns below.';
comment on column public.businesses.address_locality is
  'City or town, e.g. "Cagayan de Oro". Emitted as schema.org addressLocality.';
comment on column public.businesses.address_region is
  'Province or state, e.g. "Misamis Oriental". Emitted as addressRegion.';
comment on column public.businesses.address_country is
  'ISO 3166-1 alpha-2, e.g. "PH". Emitted as addressCountry.';

-- No RLS changes needed: the existing public-read and owner-update policies on
-- `businesses` already govern these columns.
