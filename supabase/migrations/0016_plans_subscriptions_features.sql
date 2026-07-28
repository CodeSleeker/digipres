-- ═══════════════════════════════════════════════════════════════════════════
-- 0016_plans_subscriptions_features.sql
-- Plans, subscriptions and per-business feature flags.
--
-- Effective capabilities resolve in three layers:
--   code defaults  ←  the subscribed plan's features  ←  per-business overrides
-- so a plan can define a package, and support can still grant one tenant a
-- single extra capability without inventing a new plan.
--
-- PRIVILEGE BOUNDARY: owners may READ their subscription and flags but never
-- write them — otherwise self-upgrading would be a matter of a crafted request.
-- Writes belong to platform staff (or the billing webhook via service-role).
--
-- Payment provider columns exist so Stripe can attach later WITHOUT a migration;
-- no billing integration is implemented here.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled'
);

-- ── Plans ──────────────────────────────────────────────────────────────────
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  price_cents integer not null default 0,
  interval    text not null default 'month',
  -- { "appointments": true, "ai_messages": false, … } — see lib/features
  features    jsonb not null default '{}'::jsonb,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Exactly one fallback plan for businesses without a subscription.
create unique index plans_default_key on public.plans (is_default) where is_default;

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ── Subscriptions ──────────────────────────────────────────────────────────
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  -- One subscription per business keeps resolution unambiguous.
  business_id              uuid not null unique references public.businesses (id) on delete cascade,
  plan_id                  uuid not null references public.plans (id),
  status                   public.subscription_status not null default 'trialing',
  current_period_end       timestamptz,
  provider_customer_id     text,
  provider_subscription_id text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── Per-business feature overrides ─────────────────────────────────────────
create table public.business_features (
  business_id uuid not null references public.businesses (id) on delete cascade,
  feature_key text not null,
  enabled     boolean not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (business_id, feature_key)
);

create trigger business_features_set_updated_at
  before update on public.business_features
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.plans             enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.business_features enable row level security;

-- Plans are catalogue data — any signed-in user may read them.
create policy "Plans are readable by signed-in users"
  on public.plans for select to authenticated using (true);

create policy "Platform staff manage plans"
  on public.plans for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Owners can SEE what they're on; only staff can change it.
create policy "Owners can read their subscription"
  on public.subscriptions for select to authenticated
  using (public.owns_business(business_id) or public.is_platform_admin());

create policy "Platform staff manage subscriptions"
  on public.subscriptions for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Owners can read their feature flags"
  on public.business_features for select to authenticated
  using (public.owns_business(business_id) or public.is_platform_admin());

create policy "Platform staff manage feature flags"
  on public.business_features for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ── Seed ───────────────────────────────────────────────────────────────────
insert into public.plans (code, name, price_cents, interval, is_default, features)
values
  (
    'starter', 'Starter', 0, 'month', true,
    '{"appointments": true, "reviews": true, "analytics": true, "ai_messages": false, "custom_domains": false}'::jsonb
  ),
  (
    'pro', 'Pro', 2900, 'month', false,
    '{"appointments": true, "reviews": true, "analytics": true, "ai_messages": true, "custom_domains": true}'::jsonb
  )
on conflict (code) do nothing;
