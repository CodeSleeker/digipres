-- ═══════════════════════════════════════════════════════════════════════════
-- 0003_add_google_onboarding.sql
-- Google Business Profile onboarding wizard progress.
--
-- The wizard's actual DATA reuses existing businesses columns (name, phone,
-- email, address, category, hours, logo_url, cover_image_url, description,
-- google_review_url). This column only tracks WIZARD PROGRESS as JSONB:
--   { "completedSteps": ["info", "address", ...] }
-- Completion percentage is derived from it. NULL = nothing completed yet.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists google_onboarding jsonb;

-- No RLS change: covered by the existing owner-write / public-read policies.
