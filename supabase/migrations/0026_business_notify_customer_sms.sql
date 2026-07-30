-- ═══════════════════════════════════════════════════════════════════════════
-- 0026_business_notify_customer_sms.sql
-- Per-tenant switch for the texts sent to CUSTOMERS.
--
-- Two messages hang off this: the acknowledgement when a booking is submitted
-- ("we have your request") and the confirmation when the owner accepts it.
-- Both are charged per segment and scale with however much traffic the tenant's
-- website attracts — unlike the owner's own alert, which scales with bookings
-- they were always going to receive. A tenant on a cheap plan needs to be able
-- to turn that spend off without losing their own notifications.
--
-- Defaults to TRUE so existing tenants keep the behaviour they have today; the
-- owner's alerts are unaffected either way.
--
-- This does NOT override opt-out. A customer who replied STOP is never texted
-- regardless of this column (lib/notifications/customer-notice.ts).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists notify_customer_sms boolean not null default true;

comment on column public.businesses.notify_customer_sms is
  'Send booking acknowledgement/confirmation texts to customers. Owner alerts are separate.';
