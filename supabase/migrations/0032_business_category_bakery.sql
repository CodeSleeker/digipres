-- ═══════════════════════════════════════════════════════════════════════════
-- 0032_business_category_bakery.sql
-- A category for pastry kitchens, bakeries and cake studios.
--
-- Added alongside the patisserie/boutique template. Until now the nearest fit
-- was 'cafe', which is wrong in the one place the category actually does work:
-- it is mapped to a schema.org subtype (lib/seo/json-ld.ts), and publishing a
-- cake studio as a CafeOrCoffeeShop tells search and answer engines the
-- business sells coffee to drink in. 'Bakery' is a real schema.org type and the
-- one Google's own examples use for this trade.
--
-- Placed after 'cafe' so the stored enum reads in the same order as the list
-- the pickers render (BUSINESS_CATEGORIES in schemas/business.ts). Nothing
-- depends on `enumsortorder` — the ordering is for whoever next runs `\dT+` and
-- compares the two.
--
-- NOTE ON RUNNING THIS. `alter type ... add value` cannot run inside a
-- transaction block in PostgreSQL before 12, and even on 12+ the new value is
-- not usable by other statements in the SAME transaction. This file therefore
-- adds the value and nothing else — any migration that WRITES 'bakery' must be
-- a separate file, or it will fail with "unsafe use of new value".
-- ═══════════════════════════════════════════════════════════════════════════

alter type public.business_category add value if not exists 'bakery' after 'cafe';

-- No table, policy or index changes: `category` already exists and its column
-- default ('other') is unaffected by a new member.
