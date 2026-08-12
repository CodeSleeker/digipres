-- ═══════════════════════════════════════════════════════════════════════════
-- 0036_enquiries.sql
-- A question asked of a TENANT, as opposed to a booking made with one.
--
-- WHY NOT `leads`. That table is the platform's own front door and carries no
-- business_id by design (see 0029) — a lead arrives before any business exists.
-- This is the opposite: it belongs to one tenant, is read by that tenant, and
-- must be invisible to every other. It is tenant-owned like every other table
-- here, and carries a business_id like every other table here.
--
-- WHY NOT `appointments`. Because a question is not a booking. `starts_at` is
-- NOT NULL, so a dateless enquiry could only be stored by inventing a date —
-- which would put it in the owner's calendar, count towards the pending badge,
-- and sit in the path the review automation reads. Someone asking whether
-- there is wifi would have been texted a review request for a stay they never
-- had.
--
-- WHY NOT `customers`. Decided deliberately: an enquiry is a question, not a
-- relationship. Keeping it out means the CRM stays a list of people who
-- actually booked, and the review automation cannot start messaging someone
-- who only asked a question. An owner can still convert one by hand.
--
-- WHY STORE THEM AT ALL, when the enquiry is also emailed and texted: because
-- both of those can fail silently — a bounced send, an unverified domain, a
-- spam folder, a carrier rejection. In every one of those cases the visitor was
-- told "thanks, we'll be in touch" and the question would simply not exist. The
-- row is what makes that recoverable. Same reasoning as `leads`.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,

  name    text not null check (length(trim(name)) between 1 and 120),
  -- One of email/phone is required, enforced by the constraint below: a
  -- question nobody can answer is worse than no question.
  email   text check (email is null or length(trim(email)) between 3 and 254),
  phone   text check (phone is null or length(trim(phone)) <= 40),

  /* What it is about, from the template's own list ("Amenities", "Getting
     here"). Free text rather than an enum: the choices are per-tenant CMS
     content, so the database cannot know them and should not pretend to. */
  topic   text check (topic is null or length(trim(topic)) <= 160),
  message text not null check (length(trim(message)) between 1 and 4000),

  /* Read state as a TIMESTAMP, not a boolean: "when did they see this" answers
     every question "have they seen this" does, and one more. Null = unread. */
  read_at    timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz, -- soft delete: null = active

  constraint enquiries_reply_route_present check (
    coalesce(nullif(trim(email), ''), nullif(trim(phone), '')) is not null
  )
);

-- The inbox: this tenant's enquiries, newest first, ignoring soft-deleted rows.
create index if not exists enquiries_business_created_idx
  on public.enquiries (business_id, created_at desc)
  where deleted_at is null;

-- The unread badge, which runs on every dashboard render. Partial on both
-- conditions so it stays small however long the archive grows.
create index if not exists enquiries_business_unread_idx
  on public.enquiries (business_id)
  where deleted_at is null and read_at is null;

create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.enquiries enable row level security;

/*
 * No INSERT policy, and that is deliberate.
 *
 * Enquiries arrive from members of the public, who are not authenticated —
 * exactly like bookings. The write goes through /api/enquiries with the
 * service-role client, where the tenant is resolved from the request HOST, the
 * body is parsed by a narrow schema, and two rate limits apply. An anon INSERT
 * policy would expose the same write to anyone holding the public anon key,
 * with none of that.
 */
create policy "Owners can read their enquiries"
  on public.enquiries
  for select
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- Marking read, and soft-deleting.
create policy "Owners can update their enquiries"
  on public.enquiries
  for update
  to authenticated
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- No DELETE policy: records are only soft-deleted.
