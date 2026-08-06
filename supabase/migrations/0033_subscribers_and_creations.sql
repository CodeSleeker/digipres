-- ═══════════════════════════════════════════════════════════════════════════
-- 0033_subscribers_and_creations.sql
-- The mailing list: who asked to hear from a business, what that business has
-- made lately, and which of those weekly digests have already gone out.
--
-- THE SENDING MODEL. Every tenant mails from THEIR OWN verified domain, not
-- from the platform's. That is what keeps a newsletter complaint against one
-- bakery from pushing another client's booking confirmations into spam — the
-- two never share a sending reputation. The consequence is that the feature is
-- OFF until a domain is verified: no signup box on the site, no digest job, no
-- mail. A business that has not set it up simply does not have the feature.
--
-- Verification is deliberately NOT something an owner can grant themselves,
-- for the same reason they cannot self-verify a website hostname (0010):
-- otherwise anyone could send mail as any domain they merely typed in. Enforced
-- by the trigger below rather than by GRANTs — see the note on it for why the
-- obvious approaches do not work here.
--
-- CONSENT. `consent_text` records the exact wording someone agreed to and
-- `confirmed_at` when they proved the address was theirs. Stored per subscriber
-- rather than derived from the current site copy, because the copy will change
-- and the record has to say what THEY were shown.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Per-business newsletter configuration ──────────────────────────────────
alter table public.businesses
  add column if not exists newsletter_from_email text,
  add column if not exists newsletter_from_name  text,
  add column if not exists newsletter_verified   boolean not null default false,
  add column if not exists newsletter_verified_at timestamptz;

comment on column public.businesses.newsletter_from_email is
  'Sender for this tenant''s digest, on a domain they control. Nothing sends until newsletter_verified.';

alter table public.businesses
  add constraint businesses_newsletter_from_email_format check (
    newsletter_from_email is null
    or newsletter_from_email ~ '^[^@[:space:]]+@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  );

-- Verified is meaningless without an address to verify.
alter table public.businesses
  add constraint businesses_newsletter_verified_needs_sender check (
    newsletter_verified = false or newsletter_from_email is not null
  );

/*
 * Owners may name their sender; only a trusted process may mark it verified.
 *
 * A TRIGGER rather than the column-level GRANTs used for business_domains
 * (0010). That table could revoke UPDATE wholesale and grant back the single
 * column an owner may touch; `businesses` has forty-odd columns an owner
 * legitimately edits, so the same approach would mean enumerating them all and
 * would silently make every FUTURE column read-only — the CMS would break, and
 * only at runtime.
 *
 * Two ways this was wrong before it was right, both worth keeping written down
 * because both LOOKED correct and enforced nothing:
 *
 *   1. A column-level REVOKE does nothing while the role still holds
 *      table-level UPDATE. It has to be revoked wholesale and granted back.
 *   2. SECURITY DEFINER makes `current_user` the function's OWNER rather than
 *      the caller, so the check below would never match a real tenant. This
 *      function is deliberately invoker-rights: it reads OLD/NEW and raises,
 *      and needs no privileges of its own.
 *
 * `authenticated` and `anon` are the only roles reachable with a publishable
 * key; service-role and the migration user pass through.
 */
create or replace function public.guard_newsletter_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.newsletter_verified is distinct from old.newsletter_verified
          or new.newsletter_verified_at is distinct from old.newsletter_verified_at)
  then
    raise exception
      'newsletter_verified is set by the platform after DNS verification, not by the owner'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger businesses_guard_newsletter_verification
  before update on public.businesses
  for each row execute function public.guard_newsletter_verification();

/*
 * Changing the sender address un-verifies it. Otherwise an owner could pass
 * verification for a domain they own, then repoint the address at one they do
 * not and keep the verified flag — the whole control, defeated by an UPDATE
 * the platform never sees.
 */
create or replace function public.reset_newsletter_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.newsletter_from_email is distinct from old.newsletter_from_email then
    new.newsletter_verified := false;
    new.newsletter_verified_at := null;
  end if;
  return new;
end;
$$;

-- Runs BEFORE the guard (triggers fire in name order), so an owner changing
-- their address is cleared rather than rejected for the reset it causes.
create trigger businesses_a_reset_newsletter_verification
  before update on public.businesses
  for each row execute function public.reset_newsletter_verification();

-- ── Subscribers ────────────────────────────────────────────────────────────
create type public.subscriber_status as enum ('pending', 'subscribed', 'unsubscribed');

create table public.subscribers (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,

  -- Stored lowercase so "A@x.com" and "a@x.com" are one person, enforced by the
  -- check rather than by every caller remembering to normalise.
  email           text not null,
  status          public.subscriber_status not null default 'pending',

  /*
   * Opaque per-subscriber secrets, generated server-side.
   *
   * `confirm_token` proves the address belongs to whoever clicked; without
   * confirmation nothing is ever sent to it, so a typo or a malicious signup
   * costs one email and then goes quiet.
   *
   * `unsubscribe_token` is what makes one-click unsubscribe work from an email
   * client with no session. Separate from the confirm token so that leaking one
   * (they travel in URLs, and URLs end up in logs and referrers) cannot be used
   * to perform the other action.
   */
  confirm_token     text,
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),

  -- What they were shown when they agreed, and when they proved the address.
  consent_text    text,
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  /* Where the signup came from ("footer"), for when there is more than one. */
  source          text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint subscribers_email_format check (
    email = lower(email)
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

-- One row per address per business. A person may subscribe to two different
-- bakeries; they may not appear twice on one list.
create unique index subscribers_business_email_key
  on public.subscribers (business_id, lower(email));

-- The digest's own query: everyone on this list who may be mailed.
create index subscribers_sendable_idx
  on public.subscribers (business_id)
  where status = 'subscribed';

create unique index subscribers_unsubscribe_token_key
  on public.subscribers (unsubscribe_token);

create index subscribers_confirm_token_idx
  on public.subscribers (confirm_token)
  where confirm_token is not null;

create trigger subscribers_set_updated_at
  before update on public.subscribers
  for each row execute function public.set_updated_at();

alter table public.subscribers enable row level security;

-- Deliberately NO public policy. Sign-ups arrive through a rate-limited API
-- route running as service-role, exactly like bookings — an anon INSERT policy
-- would let anyone enumerate or flood a tenant's list directly.
create policy "Owners can read their subscribers"
  on public.subscribers for select to authenticated
  using (public.owns_business(business_id));

create policy "Owners can remove their subscribers"
  on public.subscribers for delete to authenticated
  using (public.owns_business(business_id));

-- ── Creations: what the business has made lately ───────────────────────────
create table public.creations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,

  name         text not null,
  description  text,
  image_url    text,
  price        text,

  /*
   * When it counts as "new".
   *
   * The digest selects on this, not on `created_at`, so an owner can write up
   * something on Tuesday for a Sunday send, or add last week's bake without it
   * arriving in inboxes as news.
   */
  published_at timestamptz not null default now(),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Soft delete, per the platform convention: a creation already announced in a
  -- digest must not vanish from the record of what was sent.
  deleted_at   timestamptz,

  constraint creations_name_not_blank check (length(btrim(name)) > 0)
);

-- The digest's window query.
create index creations_business_published_idx
  on public.creations (business_id, published_at desc)
  where deleted_at is null;

create trigger creations_set_updated_at
  before update on public.creations
  for each row execute function public.set_updated_at();

alter table public.creations enable row level security;

create policy "Owners can read their creations"
  on public.creations for select to authenticated
  using (public.owns_business(business_id));

create policy "Owners can add their creations"
  on public.creations for insert to authenticated
  with check (public.owns_business(business_id));

create policy "Owners can update their creations"
  on public.creations for update to authenticated
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy "Owners can remove their creations"
  on public.creations for delete to authenticated
  using (public.owns_business(business_id));

-- ── Digest runs ────────────────────────────────────────────────────────────
-- What was sent, to how many, and covering which window. This is what makes the
-- weekly job idempotent: the next run reads the last `covered_to` and starts
-- there, so a retried or double-scheduled run cannot mail the same creations
-- twice.
create table public.subscriber_digests (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,

  covered_from   timestamptz not null,
  covered_to     timestamptz not null,
  creation_count integer not null default 0,
  sent_count     integer not null default 0,
  failed_count   integer not null default 0,

  created_at     timestamptz not null default now()
);

create index subscriber_digests_business_idx
  on public.subscriber_digests (business_id, covered_to desc);

alter table public.subscriber_digests enable row level security;

create policy "Owners can read their digest history"
  on public.subscriber_digests for select to authenticated
  using (public.owns_business(business_id));
