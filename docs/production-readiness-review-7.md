# Production Readiness Review — Round 7

**Date:** 2026-07-24
**Scope:** Re-audit after **P9** (close the platform gaps): entitlement gating
everywhere, per-action impersonation audit, service scoping tests, retention,
platform authorization tests. Full dimension sweep.
**Score:** **93 / 100** — 🟢 **Tenant product launch-ready; platform layer is now
strong. One High remains before super-admin support is complete.**
**0 Critical · 1 High · 4 Medium · 12 Low.**

## Verdict
Round 6 (86) flagged a billing-enforcement gap as its single High. P9 closed it
and four of the seven Mediums, and — while writing the scoping tests it asked for
— surfaced and fixed a **Critical** that had been latent since impersonation
shipped: `processDue()` scoped itself through RLS, but staff run on the
service-role client, so "Process due now" in one client's back office would have
claimed and sent **every tenant's** queued SMS (fixed in migration `0017`).

What remains is one genuine **High** — not a leak, but a wrong-tenant-write
hazard in the two actions P2 left owner-scoped — plus a Medium quality backlog
(accessibility, images) and a long tail of deliberate Low deferrals.

---

## ✅ Resolved since Round 6 (not repeated below)
| R6 | Item | How |
|---|---|---|
| High #1 | Feature gating enforced in one place | Guard on **all 8 pages + 13 mutating actions**; `tests/feature-guard.test.ts` asserts *refused*, not just hidden (P9.1) |
| #2 | Impersonation audited the session, not the actions | `auditTenantAction` on every tenant mutation; `/platform/audit` to read it (P9.2) |
| #3 | Six services untested at the scoping layer | `tests/service-scoping.test.ts` — and it caught the Critical below (P9.3) |
| #4 | `review_messages` / `audit_log` / `job_runs` unbounded | `purge_expired_rows` + nightly job, age-only, service-role-only (`0018`) (P9.4) |
| #8 | No platform authz tests; `/platform` absent from smoke | `platform-authz` + `impersonation-gates` tests; smoke 4→9 (P9.5) |
| — | **Critical (found+fixed this round):** cross-tenant SMS send under impersonation | Explicit tenant filter on `claim_due_review_messages` (`0017`) |

---

## 🔴 Critical — none

## 🟠 High
1. **`business` and `onboarding` actions act on the wrong tenant under
   impersonation.** Every other feature was moved to business-scoped context in
   P2, but `features/business/actions.ts` and `features/onboarding/actions.ts`
   still use `requireUser()` + `*ForOwner(user.id)`. When a super admin is acting
   as a client, `user.id` is the **staff member**, so:
   - if the staff member has no business of their own → `NOT_FOUND`, and they
     cannot edit the client's profile/onboarding at all;
   - if they *do* → the edit silently lands on **their own** business, not the
     client's.

   No cross-tenant read or write of the *client's* data occurs (RLS/`*ForOwner`
   still scope to the staff member), so this is **not an isolation breach** — but
   it is a wrong-tenant-write hazard and it leaves requirement 3 ("the super
   admin can operate the back office to help clients") unmet for exactly the two
   surfaces onboarding depends on. *Fix:* convert both to `getOwnerContext()` +
   business-scoped service calls (the pattern the other services already use),
   add scoping tests + an audit entry. *(Correctness / Platform)*

## 🟡 Medium
2. **Accessibility not verified to WCAG AA.** Contrast, hover-only gallery
   captions, focus-visible states, and the absence of alt text on content images
   remain unaudited. Unchanged from R6 — **still the top pre-launch quality
   item.** *(A11y)*
3. **Content images are unoptimized and non-indexable.** Rendered as CSS
   `background-image` on divs (`lib/security/css.ts` sanitizes them, which is
   good) — but that means no `next/image`, no responsive sizes, no lazy/format
   optimization, no `alt`, and nothing for a crawler. Full-size images ship on
   every tenant page (LCP cost). *(Performance / SEO / A11y)*
4. **In-memory rate limiter on serverless.** `login` (5 / 15 min) and
   `forgot-password` (3 / 15 min) are real security controls, but the store is a
   per-process `Map` — on Vercel it is not shared across lambda instances and is
   lost on cold start, so the effective limit is looser than configured. Supabase
   Auth's own server-side limiting is the backstop, which is why this is Medium
   not High. Back it with Upstash/Redis (call sites don't change). *(Security /
   scale)*
5. **No seed script and no down/rollback migrations** — now across **18**
   forward-only migrations. CI applies them all to real Postgres (good), but a
   bad deploy has no scripted reversal and there's no reproducible seed. *(Ops)*

## ⚪ Low (mostly deliberate deferrals — unchanged from R6 unless noted)
6. CSP still uses `'unsafe-inline'`; nonce-based CSP is the upgrade. *(Security)*
7. Analytics aggregate in memory with row caps — first thing to move to SQL
   aggregation as tenants grow. *(Performance)*
8. No MFA / account lockout. *(Auth)*
9. Slug change leaves the old `/s/<oldslug>` a 404 with no 301. *(Multi-tenancy)*
10. No in-app signup — owners are invited by staff (deliberate). *(Product)*
11. `/api/**` is not host-guarded on tenant domains (routes are individually
    protected). *(Multi-tenancy)*
12. Apex-vs-subdomain DNS hint is a 2-label heuristic. *(Domains)*
13. `sitemap.xml` is dynamic per host (one query per request on the apex).
    *(Performance)*
14. Edge-Config-down degraded mode serves the requested host without a canonical
    301 (deliberate stay-up trade-off). *(Routing)*
15. First platform admin is inserted by hand via SQL; **now also**: the two new
    cron routes (`retention`, `review-automation`) require `CRON_SECRET` — an
    unconfigured deploy returns 401 (fails closed, verified in smoke). *(Ops)*
16. Impersonation banner appears only in `/admin`. *(UX)*
17. No payment provider — plans assigned by staff; schema carries
    `provider_*` ids ready for Stripe (by design). *(Billing)*

## By dimension
| Dimension | State |
|---|---|
| Architecture | ✅ Strong — clean layering, business-scoped services |
| Security | ✅ No open Critical/High isolation issue; service-role blast radius now covered by scoping tests |
| Multi-tenancy | ✅ **Proven at DB** — 24 RLS/isolation tests incl. anti-hijack, platform reads, scoped SMS claim, age-only purge |
| Platform / roles | ✅ Roles, audit (now per-action), portal, impersonation — DB-gated **and** app-authz-tested |
| Billing / flags | ✅ Model, resolution **and enforcement** all tested; payment provider deferred |
| Routing / Domains | ✅ Four entry points, host-aware SEO, outage fallback |
| SEO / AI Visibility | ✅ (content-image indexability is the one gap → #3) |
| Database | 🟡 retention ✅ now; seed/rollback still open (#5) |
| Authentication | ✅ (Low: MFA #8, in-memory limiter #4) |
| Review Automation | ✅ scheduled, atomic-claim, idempotent, **tenant-scoped**, observable |
| SMS | ✅ Twilio + opt-out/consent/E.164 |
| Testing | ✅ **187 tests** incl. 24 DB-level; both run modes + build + 9-check smoke green |
| Deployment | ✅ health page (+retention tile), two crons, headers, Node pin, CI w/ Postgres |
| Accessibility | 🟡 needs a verified AA pass (#2) |

---

## Launch gate (operational, not a scored finding)
**Migrations `0011`–`0018` must be applied**, and the first `super_admin` seeded:
`insert into public.platform_admins (user_id, role) values ('<uuid>','super_admin');`
Until `0017`/`0018` are applied, `claimDue` and the retention job will error.

## Next phase — P10
1. **(High #1)** Business-scope `business` + `onboarding` actions so
   impersonation operates the client's record; scoping tests + audit entry.
2. **(Medium #2)** Accessibility AA pass — the top quality item.
3. **(Medium #3)** Image pipeline — `next/image` or an optimized asset path, with
   `alt`.
4. **(Medium #5)** Seed script + rollback/down migrations.

Then the Low tail as desired (nonce CSP, distributed rate limiter, SQL analytics).

## Why the score moved 86 → 93
P9 closed the R6 High and four Mediums, added the impersonation audit trail and
retention, and deepened tests (131 → 187, incl. platform authz and the three
impersonation gates). A latent **Critical** was found and fixed. The remaining
High is a **correctness/requirement** gap on two owner-scoped actions, not an
isolation breach — the 24 database-level tests still prove a tenant cannot reach
another tenant's rows, an owner cannot self-verify a domain or grant themselves
platform access, and staff cannot purge or shred the audit log.
