-- ═══════════════════════════════════════════════════════════════════════════
-- 0025_business_notification_contacts.sql
-- Where booking alerts go, as distinct from what the website prints.
--
-- Until now lib/notifications/booking-notice.ts sent to `email` and `phone` —
-- the PUBLIC contact details on the tenant's website. For a one-person shop
-- that's the right inbox and the phone in their pocket. For anyone larger it's
-- often a shared `info@` nobody watches, or a landline that can't receive SMS,
-- so the alert about a new booking lands where no one sees it.
--
-- Both nullable, and read as an override: null means "use the public one", so
-- existing tenants keep today's behaviour with no backfill.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists notify_email text,
  add column if not exists notify_phone text;

comment on column public.businesses.notify_email is
  'Where booking alerts are emailed. Falls back to `email` when null.';
comment on column public.businesses.notify_phone is
  'Where booking alerts are texted. Falls back to `phone` when null.';

-- No RLS changes needed: the existing public-read and owner-update policies on
-- `businesses` already govern these columns.
--
-- NOTE: `businesses` is publicly readable (active tenants), so these columns are
-- readable by anyone, exactly like `email` and `phone` already are. They are
-- contact details for the same business, not secrets — but do not put anything
-- here that shouldn't be public.
