-- ═══════════════════════════════════════════════════════════════════════════
-- 0028_business_sms_sender_id.sql
-- Per-tenant alphanumeric SMS sender ID, set by platform staff.
--
-- Replaces two implicit sources that were both wrong:
--
--   1. The business NAME, normalized at send time. Convenient, but the name is
--      client-editable, so renaming a shop silently changed the label their
--      customers see — and carriers require sender IDs to be REGISTERED, so a
--      rename could quietly start getting messages rejected.
--   2. A single PHILSMS_SENDER_ID for the whole platform. One environment
--      variable cannot be right for many tenants.
--
-- Sender IDs are registered with the carrier per business, so the value belongs
-- on the business row and is deliberately writable only from the super admin
-- portal: it is an account-level arrangement with the carrier, not a preference.
--
-- CONSTRAINT: the GSM standard caps alphanumeric sender IDs at 11 characters,
-- and carriers reject anything outside [A-Za-z0-9 ]. Enforced here as well as in
-- Zod, because a value that violates it is not a validation inconvenience — it
-- is a message the carrier silently drops or relabels.
--
-- BACKFILL: existing rows are seeded from the business name, normalized the same
-- way the old send-time code did, so behaviour on deploy is unchanged and no
-- tenant stops sending. This is a one-time seed; the name is never consulted
-- again. Rows whose name yields nothing usable are left NULL.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists sms_sender_id text;

-- Seed from the name, mirroring lib/sms/gsm7.ts + normalizeSenderId exactly:
-- strip characters the carrier rejects, collapse whitespace, then keep as many
-- WHOLE words as fit in 11 characters.
--
-- `^.{1,11}(?= |$)` does the word-boundary truncation on its own: the quantifier
-- is greedy, so it takes the longest prefix of 1–11 characters that is followed
-- by a space or the end of the string.
--   "Ronies"          -> "Ronies"        (whole value fits)
--   "Ronies Barber"   -> "Ronies"        (11 would cut "Barb", so it backtracks)
--   "Extraordinarily" -> no match        (single word, no boundary in range)
-- The coalesce covers that last case: one word longer than the limit still has
-- to be cut somewhere, so it falls back to a hard 11-character slice.
with normalized as (
  select
    id,
    trim(
      regexp_replace(
        regexp_replace(name, '[^A-Za-z0-9 ]+', ' ', 'g'),
        '\s+', ' ', 'g'
      )
    ) as cleaned
  from public.businesses
)
update public.businesses b
set sms_sender_id = nullif(
  coalesce(substring(n.cleaned from '^.{1,11}(?= |$)'), left(n.cleaned, 11)),
  ''
)
from normalized n
where b.id = n.id
  and b.sms_sender_id is null;

alter table public.businesses
  drop constraint if exists businesses_sms_sender_id_format;

alter table public.businesses
  add constraint businesses_sms_sender_id_format
  check (sms_sender_id is null or sms_sender_id ~ '^[A-Za-z0-9][A-Za-z0-9 ]{0,10}$');

comment on column public.businesses.sms_sender_id is
  'Alphanumeric SMS sender ID registered with the carrier for this business (max 11 chars). Super admin only. NULL means the provider default applies where the provider supports one.';
