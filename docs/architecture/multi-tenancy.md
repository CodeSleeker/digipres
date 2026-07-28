# Multi-Tenancy Architecture

How the Digital Presence Platform isolates many businesses ("tenants") in one
deployment, and where each part of the tenant boundary lives.

## Tenancy model

- A **tenant = one `businesses` row**, owned by one authenticated user
  (`businesses.owner_id → auth.users`). One active business per owner
  (partial unique index on `owner_id where deleted_at is null`).
- **Every resource belongs to a business.** `customers`, `appointments`, and
  `review_messages` each carry `business_id uuid NOT NULL REFERENCES businesses
  ON DELETE CASCADE`. There is no un-scoped tenant data.
- Each business has a unique active **`slug`** (partial unique index), which
  addresses its public website.

## Isolation — defense in depth

Three independent layers each enforce that a tenant only ever touches its own
data. Any one of them is sufficient; together they fail safe.

1. **Row Level Security (database).** RLS is enabled on all tables.
   - `businesses`: publicly **readable** (so public sites render for anyone),
     but only the owner may insert/update; no delete policy (soft-delete only).
   - Private tables (`customers`, `appointments`, `review_messages`): all
     access is gated by `public.owns_business(business_id)` — true only when
     `auth.uid()` owns that active business. Defined once in
     [`0007_tenant_rls_helpers.sql`](../../supabase/migrations/0007_tenant_rls_helpers.sql)
     and reused by every policy so the rule can't drift between tables.
2. **Service layer.** Each service resolves the acting owner's business and
   scopes every repository call to `business.id` (e.g.
   `services/customer-service.ts`). This holds even if RLS were misconfigured.
3. **Repository layer.** Every query is filtered by `business_id` (and
   `deleted_at is null`), e.g. `repositories/customer-repository.ts`.

The **service-role client** (`lib/supabase/service.ts`) bypasses RLS. It is used
by the scheduled jobs (review automation, retention), which must serve every
tenant — and, since the super admin portal shipped, by **impersonation**: when
platform staff act as a client, the back office runs on the service-role client
so it can reach that client's rows.

> **This is why layer 2 is not optional.** For an impersonated request there is
> no RLS: the `businessId` the service was given is the *only* boundary. Any code
> that infers its scope from "whatever the injected client can see" is correct
> for an owner session and wrong for a staff one. `processDue()` was exactly that
> — see [`0017`](../../supabase/migrations/0017_claim_due_scoped_to_business.sql),
> which added an explicit tenant filter after an unscoped claim would have sent
> every tenant's SMS. Scoping is asserted in `tests/service-scoping.test.ts`.

## Two request surfaces

The middleware entry point ([`proxy.ts`](../../proxy.ts)) branches by path and
never mixes concerns:

| Surface | Paths | Handler | Talks to Supabase? |
|---|---|---|---|
| **Auth** | `/admin/**`, `/login` | `updateSession()` (`lib/supabase/middleware.ts`) | Yes — refreshes session, gates routes |
| **Public** | `/`, `/s/**`, everything else the matcher allows | `tenantMiddleware()` (`lib/supabase/tenant-middleware.ts`) | No — pure host→slug rewrite |

Keeping the public branch Supabase-free means tenant websites keep rendering
even if auth/DB is unconfigured.

## Business slug routing (public)

Tenants are resolved by **slug**, carried either by a subdomain or an explicit
path:

- **Subdomain (production):** `ronies.example.com`. When
  `NEXT_PUBLIC_ROOT_DOMAIN` is set, `tenantMiddleware()` derives the slug via
  `tenantSlugFromHost()` (`lib/tenant/resolve.ts`) and **rewrites** the request
  to the internal route `/s/ronies`.
- **Path (local/apex):** `/s/ronies` works directly — used in local dev where
  subdomains aren't practical. Leave `NEXT_PUBLIC_ROOT_DOMAIN` blank locally.
- **Apex `/`:** renders the `DEV_BUSINESS_SLUG` tenant as a convenience
  (`lib/website/load-profile.ts`), falling back to the static template default.

The tenant page [`app/s/[slug]/page.tsx`](../../app/s/[slug]/page.tsx) loads the
profile for **that slug only** via `loadTenantProfileBySlug()`
(`lib/tenant/profile.ts`), which reads the active business through the public
anon client and merges it over the template default. An unknown slug → `404`.

## Business context

`lib/tenant/business-context.ts` centralizes "which tenant am I acting as" for
the admin surface:

- `getOwnerContext()` → `{ supabase, user, business | null }` in one auth check.
  Use where a business-less owner is valid (onboarding, empty-state dashboards).
  The admin layout uses it to show the current business name/slug.
- `requireBusinessContext()` → same but with a guaranteed `business`, else
  redirects to `/admin/onboarding`.

Services continue to resolve/scope by `business.id` internally, so this context
is a convenience and a single source of truth — not the only line of defense.

**Every** tenant service is now business-scoped, including `business` and
`onboarding` (the last two that resolved by owner). Under impersonation the
resolver hands back the client's business + the service-role client, so a
tenant-scoped `updateById(businessId, …)` operates the client's record; an
owner-keyed `findByOwnerId(user.id)` would have operated the acting *staff
member's* own record instead. Two operations stay owner-only and refuse while
impersonating — **creating** a business (the "one per owner" invariant; new
clients are made via platform onboarding) and **deleting** one (account
termination is a super_admin action in the platform portal, not a support
task).

## Where each concern lives

| Concern | File(s) |
|---|---|
| Tenant slug from host | `lib/tenant/resolve.ts` |
| Public profile by slug | `lib/tenant/profile.ts` |
| Admin business context | `lib/tenant/business-context.ts` |
| Tenant-aware middleware | `proxy.ts`, `lib/supabase/tenant-middleware.ts` |
| Auth/session middleware | `lib/supabase/middleware.ts` |
| Public tenant route | `app/s/[slug]/page.tsx` |
| Apex `/` route | `app/page.tsx`, `lib/website/load-profile.ts` |
| RLS tenant boundary | `supabase/migrations/0007_tenant_rls_helpers.sql` |
| Per-table RLS | `supabase/migrations/0001,0004,0005,0006` |

## Environment

| Var | Purpose |
|---|---|
| `DEV_BUSINESS_SLUG` | Tenant rendered at `/` in dev/apex. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Root domain for subdomain→slug routing. Blank disables subdomain routing (use `/s/<slug>`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role client for the scheduled jobs and impersonation (bypasses RLS). |
| `CRON_SECRET` | Bearer token both job routes require. Unset = every call is rejected. |
| `RETENTION_MESSAGE_DAYS` | Terminal review messages. Default 90. |
| `RETENTION_JOB_RUN_DAYS` | Job execution history. Default 90. |
| `RETENTION_AUDIT_DAYS` | Staff audit trail. Default 730 — kept longest on purpose. |

An invalid retention value falls back to its default rather than shortening the
window (`lib/jobs/retention.ts`): a typo must not quietly begin deleting data.

## Verifying isolation

Automated: `npm test` covers the application layer; pointing `DATABASE_URL` at a
throwaway Postgres additionally runs `tests/db/rls.integration.test.ts`, which
applies every migration and asserts the boundary in the database itself.

Manually:

1. Apply migrations `0001`–`0018`.
2. Create two owners, each with a business (`acme`, `ronies`) and some customers.
3. Public: visit `/s/acme` and `/s/ronies` — each shows only its own content;
   `/s/does-not-exist` → 404. With `NEXT_PUBLIC_ROOT_DOMAIN=example.com`,
   `acme.example.com` rewrites to `/s/acme`.
4. Admin: sign in as owner A — the header shows A's business; `/admin/customers`
   lists only A's customers. RLS makes A's session unable to read B's rows even
   with a crafted `business_id`.

## What was NOT changed

- Per-table RLS policies remain (0007 only DRYs their predicate).
- One-owner-one-business remains the model (no org/team layer yet).
