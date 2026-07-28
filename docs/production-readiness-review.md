# Production Readiness Review

**Project:** Digital Presence Platform (multi-tenant SaaS)
**Date:** 2026-07-22
**Verdict:** 🔴 **Not yet production-ready.** The architecture is sound and the
tenant isolation is solid, but there are **5 blockers** (data correctness &
customer-facing harm) and several high-severity gaps to close first. A realistic
path to green is outlined at the end.

## Severity legend
| | Meaning |
|---|---|
| 🔴 **Blocker** | Causes incorrect behavior, data loss, cost, or user harm in production. Fix before deploy. |
| 🟠 **High** | Serious risk or missing safeguard; fix before or immediately around launch. |
| 🟡 **Medium** | Should fix soon; degrades quality/scale/maintainability. |
| ⚪ **Low** | Nice-to-have / cleanup. |
| ✅ **Good** | Already done well. |

## Scorecard
| Dimension | State | Headline |
|---|---|---|
| Security | 🟠 Needs work | Strong RLS; unsanitized image URLs, no headers, no rate limits |
| Performance | 🟠 Needs work | Unoptimized background images; fully-dynamic public pages |
| Accessibility | 🟠 Needs work | Content images have no text alternative; contrast unverified |
| SEO | 🟠 Needs work | No canonical/robots/sitemap/JSON-LD; duplicate URLs per tenant |
| AI Visibility | 🟠 Needs work | Same as SEO; in-app module already maps the gaps |
| Database | 🔴 Blocker | Migrations not applied; unbounded queue; no rollback/seed |
| API | 🔴 Blocker | Cron can double-send SMS under concurrency |
| Authentication | 🟠 Needs work | Verify email-confirmation enforced; no reset/MFA/lockout |
| Folder Structure | ✅ Good | Clean feature-based layering; minor duplication |
| Technical Debt | 🟠 Needs work | No tests/CI; CMS revalidation misses tenant pages |

---

## 🔴 Blockers (must fix before deploy)

1. **Database migrations not applied.** Migrations `0001`–`0007` define every
   table, RLS policy, and the `owns_business()` tenant function. The app cannot
   function until they're applied to the production Supabase project. Apply in
   order and verify RLS is enabled on all tables.

2. **Cron can double-send SMS (concurrency race).**
   `ReviewMessageRepository.listDue()` selects `queued` rows and
   `ReviewAutomationService.processDue()` sends then marks them `sent` — with no
   row lock. Two overlapping cron invocations (or a retry) both read the same due
   rows and **both send**, texting customers twice and incurring double carrier
   cost. *Fix:* claim rows atomically — `SELECT … FOR UPDATE SKIP LOCKED` (via an
   RPC) or an UPDATE…RETURNING that flips `queued→sending` before sending; make
   the send idempotent on `provider_message_id`.
   → `services/review-automation-service.ts`, `repositories/review-message-repository.ts`

3. **CMS edits don't refresh live tenant pages.** After the multi-tenant routing
   refactor, tenant sites render at `/s/[slug]`, but the CMS and onboarding
   actions still call `revalidatePath("/")` only. Owners will edit content and
   see no change on their real public page. *Fix:* also
   `revalidatePath(\`/s/${business.slug}\`)` (and the apex `/` if used).
   → `features/website-cms/actions.ts:68`, `features/onboarding/actions.ts:111`

4. **Confirm email verification is enforced.** `login()` calls
   `signInWithPassword` and trusts the result; whether unconfirmed accounts can
   sign in depends on the Supabase Auth project setting. If "Confirm email" is
   off, unverified users gain access. *Fix:* enable email confirmation in
   Supabase Auth settings and verify the sign-up path. → `lib/auth/actions.ts`

5. **No automated tests or CI.** There is no test runner, and no pipeline runs
   lint/build/migrations. For a multi-tenant app handling customer PII and
   sending SMS, ship at least: RLS isolation tests (tenant A cannot read B),
   a scheduler idempotency test, and a smoke e2e. Add a CI gate on lint+build.

---

## 🔒 Security

- 🟠 **CSS injection via image URLs.** Owner-supplied image URLs are interpolated
  raw into inline styles: `style={{ backgroundImage: \`url('${item.image}')\` }}`.
  A value containing `')` can break out of `url()` and inject arbitrary CSS into
  that tenant's page. *Fix:* validate URLs in the Zod schemas (require
  `https?://`, reject quotes/parens/whitespace) and/or move to `<img>`/next/image.
  → `templates/barber/luxury/components/gallery-item.tsx:21`, `sections/hero.tsx:23`, others.
- 🟡 **Cron secret compared non-constant-time.** `auth !== \`Bearer ${secret}\``
  is vulnerable to timing analysis. Use `crypto.timingSafeEqual`. (Good: it
  correctly 401s when the secret is unset.) → `app/api/jobs/review-automation/route.ts:15`
- 🟡 **No security headers.** `next.config.ts` is empty — no CSP, HSTS,
  X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
  Add a `headers()` block (CSP is highest value).
- 🟡 **No app-level rate limiting** on login or the cron route (relies on
  Supabase's built-in auth limits). Add throttling / a WAF at the edge.
- ✅ **Strong foundations:** RLS on every table; service-role client confined to
  the cron; Zod validation on all inputs; generic auth errors (no user
  enumeration); secrets `.env*` git-ignored; server actions never leak internals.

## ⚡ Performance

- 🟠 **Images are unoptimized CSS backgrounds.** No `next/image`, no
  lazy-loading, no responsive `srcset`, no intrinsic dimensions → poor LCP on the
  hero and layout shift risk. Move content images to `<img>`/`next/image` with
  width/height; keep purely decorative ones as backgrounds.
- 🟡 **Public tenant pages are fully dynamic** (every request re-queries the DB).
  Content changes rarely — add ISR/`revalidate` or tag-based caching so
  `/s/[slug]` is served from cache and invalidated on CMS save (ties to Blocker 3).
- 🟡 **Analytics aggregates in memory** (up to 5000 rows per chart via `ROW_CAP`).
  Fine at current scale; move to SQL aggregates / materialized views before large
  tenants. → `repositories/analytics-repository.ts`
- ✅ No heavy chart dependency (custom SVG); indexes on `business_id`/`created_at`;
  appointment name-join is batched (no N+1).

## ♿ Accessibility

- 🟠 **Content images have no text alternative.** Gallery/hero images are CSS
  backgrounds, invisible to screen readers; gallery captions are hover-only.
  Provide real `<img alt>` or visually-hidden text; make captions non-hover.
- 🟡 **Contrast likely fails WCAG AA** in places (e.g. `#888` gray on `#1a1a1a`
  ≈ 3.5:1, below 4.5:1 for body text). Audit and darken/lighten as needed.
- 🟡 **Keyboard & focus:** verify visible focus states on custom controls and
  that hover-revealed content is reachable without a pointer.
- ✅ `lang="en"` set; forms use `<label>`; social links have `aria-label`.
- **Recommend** a Lighthouse/axe pass and fixing to AA before launch.

## 🔎 SEO & 🤖 AI Visibility

- 🟠 **Duplicate content across URLs.** The same tenant renders at `/`,
  `/s/[slug]`, and `<slug>.domain` with no canonical. Pick one canonical host,
  set `metadataBase`, and emit `alternates.canonical`; 301 the others.
- 🟠 **Missing `robots.ts` and `sitemap.ts`.** Add both (sitemap should list
  active tenant slugs; disallow `/admin` and `/api`).
- 🟠 **No structured data.** Emit JSON-LD `Organization` + `LocalBusiness`
  (+ `FAQPage` once FAQ exists) — the single highest-value AI-readiness item.
- 🟡 Content images as backgrounds aren't indexable (see A11y/Perf).
- ℹ️ The in-app **AI Visibility** module already enumerates these; note its
  `PLATFORM` flags are hand-maintained, so flip them as you ship each fix.
- ✅ Per-tenant title/description/OG/Twitter via `generateMetadata`.

## 🗄️ Database

- 🔴 Migrations not applied (Blocker 1).
- 🟡 **Unbounded `review_messages` queue** — no retention/archival; grows forever.
  Add a cleanup job for old terminal-state rows.
- 🟡 **No rollback (down) migrations, no seed script, no migration runner in CI.**
  Applying is currently manual; automate and make reversible.
- 🟡 **Verify range-scan index** for analytics/calendar:
  `appointments(business_id, starts_at)` supports the `starts_at >= since`
  queries; add if absent.
- ✅ FKs with `ON DELETE CASCADE`, soft-delete, `updated_at` triggers, partial
  unique indexes, enums, and the centralized `owns_business()` RLS function.

## 🔌 API

- 🔴 Cron double-send race (Blocker 2).
- 🟡 **No observability.** Errors are `console.error` only — no structured
  logging, metrics, or alerting; no `/health` endpoint. Add before relying on the
  cron in production.
- 🟡 **Server Actions** rely on Next's same-origin/action-encryption for CSRF
  (acceptable) but have no rate limiting.
- ✅ Cron is auth-gated and returns generic errors; single, well-scoped route.

## 🔑 Authentication

- 🔴 Confirm email verification is enforced (Blocker 4).
- 🟡 **No password reset / forgot-password flow.**
- 🟡 **No self-serve sign-up flow in-app** — confirm how owners are provisioned.
- 🟡 **No MFA, account lockout, or explicit session-timeout policy** beyond
  Supabase defaults.
- ✅ Middleware session refresh; `requireUser` guards; httpOnly cookies via
  `@supabase/ssr`; generic errors; `/admin` gated in middleware **and** layout.

## 📁 Folder Structure

- ✅ Clean feature-based architecture with consistent Repository→Service→Action
  layering (`app/`, `features/`, `services/`, `repositories/`, `schemas/`,
  `types/`, `lib/`, `templates/`, `components/ui`).
- ⚪ **Duplicate `requireUser`:** the canonical one in
  `lib/auth/require-user.ts` is re-defined inline in
  `features/business/actions.ts` — consolidate.
- ⚪ `lib/supabase/tenant-middleware.ts` doesn't use Supabase; it fits better
  under `lib/tenant/`.
- ⚪ Static `lib/businesses` registry remains as a fallback — plan its removal.

## 🧹 Technical Debt

- No tests / CI (Blocker 5).
- CMS revalidation misses tenant pages (Blocker 3).
- 🟡 **Node version not pinned** (`engines` empty); Supabase warns Node 20 is
  deprecated. Require Node 22 (`engines`, `.nvmrc`, deployment runtime).
- ⚪ Placeholder analytics (visitors, Google reviews) — clearly labeled; ensure
  stakeholders know they're samples.
- ⚪ `as unknown as Resolver<T>` casts in forms; `DEV_BUSINESS_SLUG` coupling for `/`.

---

## Recommended path to production

**Phase 1 — Blockers (do first)**
1. Apply migrations `0001`–`0007`; verify RLS enabled + `owns_business()` present.
2. Make the SMS scheduler claim rows atomically (`FOR UPDATE SKIP LOCKED`) and
   idempotent.
3. Revalidate `/s/[slug]` on CMS/onboarding saves.
4. Enforce email confirmation in Supabase; verify the sign-in path.
5. Add a CI gate (lint + build) and a first test suite: RLS isolation +
   scheduler idempotency + one smoke e2e.

**Phase 2 — Launch hardening**
6. Sanitize/validate image URLs (or switch to `next/image`).
7. Add security headers (CSP first) and edge rate limiting.
8. SEO essentials: canonical + `metadataBase`, `robots.ts`, `sitemap.ts`,
   LocalBusiness JSON-LD.
9. Accessibility pass to WCAG AA (contrast, alt text, focus).
10. Password reset flow; observability/logging + `/health`.

**Phase 3 — Scale & polish**
11. ISR/tag caching for public pages; image optimization.
12. Move analytics to SQL aggregates; add queue retention.
13. Pin Node 22; remove the static registry; consolidate `requireUser`.

## What's already strong
Tenant isolation (RLS + service + repository, three layers), clean layered
architecture, consistent Zod validation, no internal-error leakage, a
well-scoped service-role boundary, and green type-check/lint/build. The
foundation is solid — the work above is about safety, correctness at the edges,
and operational readiness, not re-architecture.
