-- ═══════════════════════════════════════════════════════════════════════════
-- 0037_lodging_details.sql
-- The structured facts a place to STAY has, and a shop does not.
--
-- WHY THIS EXISTS. `category` already publishes a lodging tenant as
-- schema.org LodgingBusiness (migration 0034), but the JSON-LD carried only the
-- generic fields — name, address, phone, hours. So an answer engine could learn
-- that the business is lodging and nothing about the stay: not what time
-- check-in is, not whether dogs are allowed, not how many bedrooms. Those are
-- precisely the questions guests ask before booking, and `LodgingBusiness`
-- has properties for every one of them (checkinTime, checkoutTime,
-- numberOfRooms, petsAllowed, amenityFeature).
--
-- WHY JSONB RATHER THAN COLUMNS. Every field here is meaningless for the other
-- twelve categories. Five nullable columns that are null for every barber,
-- bakery and clinic on the platform would invite exactly the query that
-- silently returns nothing — the same argument migration 0029 makes for
-- keeping business_id off `leads`. One nullable document says "this applies to
-- some tenants" in a way a reader cannot miss.
--
-- NOT A WEBSITE SECTION. These are facts about the business, like its phone
-- number and its hours, not copy about it — so they live beside those on
-- `businesses` rather than in the *_content columns the CMS edits. The template
-- may choose to render them; the structured data always does.
--
-- NULL means "not filled in", and every field inside is optional too: a partly
-- completed document emits the parts it has. Publishing `petsAllowed: false`
-- because nobody ticked a box would be a claim the owner never made.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists lodging_details jsonb;

-- No RLS changes needed: the existing "Active businesses are publicly readable"
-- policy already exposes this column to the public site, and the owner update
-- policy already governs writes.
