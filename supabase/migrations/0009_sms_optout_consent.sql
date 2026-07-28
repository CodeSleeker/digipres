-- ═══════════════════════════════════════════════════════════════════════════
-- 0009_sms_optout_consent.sql
-- SMS compliance: record consent and honor opt-out (STOP).
--
--  - sms_consent_at   : when the contact was recorded with a mobile number
--                       (audit trail that we had a basis to message them).
--  - sms_opted_out_at : when the customer replied STOP (paired with the existing
--                       sms_status = 'opted_out').
--
-- Numbers are stored E.164 (normalized on save), so the inbound opt-out webhook
-- can match a customer by phone. An index on mobile supports that lookup.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.customers
  add column if not exists sms_consent_at   timestamptz,
  add column if not exists sms_opted_out_at timestamptz;

-- Inbound opt-out matches customers by phone number (service-role, cross-tenant).
create index if not exists customers_mobile_idx
  on public.customers (mobile)
  where deleted_at is null;
