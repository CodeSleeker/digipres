-- ═══════════════════════════════════════════════════════════════════════════
-- 0043_tenant_sender.sql
-- One verified sending DOMAIN per tenant, and an address per purpose on it.
--
-- WHAT WAS WRONG. 0033 gave a tenant exactly one sender, `newsletter_from_email`,
-- verified as a single address. That shape came from the only feature that
-- needed it, and it cannot express what a client actually asks for: mail about
-- an enquiry from hello@theirdomain, mail about a booking from booking@, the
-- digest from news@. Adding a column per feature would re-verify the same
-- domain three times.
--
-- WHY THE DOMAIN IS THE UNIT. Because that is what the provider verifies.
-- Resend (and Brevo, and SES) authenticate a DOMAIN via DKIM and SPF; once
-- theirdomain.com passes, EVERY local part on it can send. Verifying
-- "hello@theirdomain.com" was always a fiction — the DNS records prove nothing
-- about the part before the @.
--
-- The practical gain: an owner adds `booking@` without re-verifying anything,
-- because the check constraint below already forces it onto the domain the
-- platform verified. Under 0033 that was a second verification cycle.
--
-- EXPAND, NOT RENAME. The newsletter columns stay. Renaming them would break
-- the running deployment the instant this migration applied — the code in
-- production still selects `newsletter_from_email` — and there is no ordering
-- of a rename and a deploy that avoids that window. So this adds, backfills,
-- and a later migration drops the old columns once the new code is live.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists sender_domain           text,
  add column if not exists sender_verified         boolean not null default false,
  add column if not exists sender_verified_at      timestamptz,
  add column if not exists sender_from_name        text,
  add column if not exists sender_newsletter_email text,
  add column if not exists sender_enquiry_email    text,
  add column if not exists sender_booking_email    text;

comment on column public.businesses.sender_domain is
  'The tenant sending domain the platform verified (DKIM/SPF). Every purpose address below must be on it.';
comment on column public.businesses.sender_verified is
  'Set by the platform after checking DNS, never by the owner. See the trigger below.';

-- ── Backfill from the single-address model ─────────────────────────────────
-- The domain is the part after the @; the address it came from becomes the
-- newsletter purpose, which is the only thing that was ever sending from it.
update public.businesses
set sender_domain           = lower(split_part(newsletter_from_email, '@', 2)),
    sender_newsletter_email = lower(newsletter_from_email),
    sender_from_name        = newsletter_from_name,
    sender_verified         = newsletter_verified,
    sender_verified_at      = newsletter_verified_at
where newsletter_from_email is not null
  and sender_domain is null;

-- ── Shape ──────────────────────────────────────────────────────────────────
alter table public.businesses
  add constraint businesses_sender_domain_format check (
    sender_domain is null
    or sender_domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  );

-- Verified is meaningless without a domain to have verified.
alter table public.businesses
  add constraint businesses_sender_verified_needs_domain check (
    sender_verified = false or sender_domain is not null
  );

/*
 * Every purpose address must sit on the verified domain.
 *
 * This is the constraint that lets an owner add `booking@` without a second
 * verification cycle: the platform vouched for the domain, and the database
 * guarantees nothing can send from outside it. Without this, the address
 * fields would be free text and the verification would mean nothing.
 */
alter table public.businesses
  add constraint businesses_sender_addresses_on_domain check (
    (
      sender_newsletter_email is null
      or (sender_domain is not null
          and lower(split_part(sender_newsletter_email, '@', 2)) = sender_domain)
    )
    and (
      sender_enquiry_email is null
      or (sender_domain is not null
          and lower(split_part(sender_enquiry_email, '@', 2)) = sender_domain)
    )
    and (
      sender_booking_email is null
      or (sender_domain is not null
          and lower(split_part(sender_booking_email, '@', 2)) = sender_domain)
    )
  );

-- ── Who may say "verified" ─────────────────────────────────────────────────
/*
 * The same control 0033 established, moved to the domain. Read the long note
 * there for why this is a trigger and not a column GRANT, and for the two ways
 * it was wrong before it was right (a column REVOKE does nothing while
 * table-level UPDATE stands; SECURITY DEFINER makes current_user the owner).
 *
 * Invoker-rights, deliberately: it reads OLD/NEW and raises, and needs no
 * privileges of its own.
 */
create or replace function public.guard_sender_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.sender_verified is distinct from old.sender_verified
          or new.sender_verified_at is distinct from old.sender_verified_at)
  then
    raise exception
      'sender_verified is set by the platform after DNS verification, not by the owner'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger businesses_guard_sender_verification
  before update on public.businesses
  for each row execute function public.guard_sender_verification();

/*
 * Changing the DOMAIN un-verifies it. Otherwise an owner could pass
 * verification for a domain they own, repoint at one they do not, and keep the
 * flag — the whole control defeated by an UPDATE the platform never sees.
 *
 * Changing a purpose ADDRESS deliberately does not reset anything: the
 * constraint above already holds it on the verified domain, and the DNS
 * records say nothing about the local part. That is the difference this
 * migration buys.
 */
create or replace function public.reset_sender_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sender_domain is distinct from old.sender_domain then
    new.sender_verified := false;
    new.sender_verified_at := null;
  end if;
  return new;
end;
$$;

-- Runs BEFORE the guard (triggers fire in name order), so an owner changing
-- their domain is cleared rather than rejected for the reset it causes.
create trigger businesses_a_reset_sender_verification
  before update on public.businesses
  for each row execute function public.reset_sender_verification();

-- No RLS changes: the existing owner-update policy already governs these
-- columns, and the triggers above are what narrow it.
