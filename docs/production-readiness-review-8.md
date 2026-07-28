# Production Readiness Review — Round 8

**Date:** 2026-07-24
**Scope:** Re-audit after **P10** (business-scoped business/onboarding actions,
template accessibility to AA, image pipeline, seed + rollback policy) and the
**Aliamz Digital landing page**.
**Score:** **94 / 100** — 🟢 **Product-ready across tenant, platform, and
marketing surfaces. One newly-recognized High — operational, not code — plus a
short launch checklist.**
**0 Critical · 1 High · 2 Medium · 11 Low.**

## Verdict
Round 7's High (wrong-tenant writes under impersonation) and three of its four
Mediums are closed, the platform finally has a real front door at the apex, and
bootstrap is one command instead of dashboard surgery. The codebase itself has
no open High. The High below is about the **project**, not the code — and this
audit owes you honesty about why it wasn't reported sooner.

---

## ✅ Resolved since Round 7 (not repeated below)
| R7 | Item | How |
|---|---|---|
| High #1 | `business`/`onboarding` actions acted on the wrong tenant under impersonation | Business-scoped services (`updateById`/`saveStepForBusiness`); create/delete refused while impersonating (by decision); audited; 10 scoping tests |
| #2 | Accessibility unverified | Template AA pass: working mobile nav (was dead), keyboard-reachable gallery, focus-visible, skip link, text alternatives |
| #3 | Images unoptimized / not indexable | `TenantImage` pipeline: `next/image` for allow-listed hosts, safe plain-`<img>` fallback for CMS-pasted URLs, hero `priority` (preload verified), real `alt` — 0 CSS-background images left |
| #5 | No seed, no rollback story | `npm run seed` (idempotent, email-resolved — no UUID copying) + documented forward-only migration policy (`docs/operations.md`) |
| R7 Low | First admin inserted by hand via SQL | Same seed script |
| (unnumbered) | Apex served a barber demo as the platform's face | Aliamz Digital landing page; mode decision unit-tested; tenant preview and all tenant routing untouched |

---

## 🔴 Critical — none

## 🟠 High
1. **The project is not under version control.** There is no `.git` directory.
   Consequences compound:
   - the `.github/workflows` CI pipeline — cited as a strength since Round 2 —
     **has never actually executed**; it can only run on a pushed repository;
   - no code history, no reviewable diffs, no revert path for a bad change
     (the migration rollback policy exists, but *code* rollback assumes Vercel
     deploys, which themselves are git-driven);
   - a disk failure on this machine is total project loss.

   *Audit candor:* every prior round scored "Deployment ✅ CI w/ Postgres"
   without verifying the pipeline could run at all. That was this audit's
   error; it is corrected here. *Fix:* `git init`, commit, push to a private
   GitHub repo (CI then runs on the next push), connect Vercel to the repo.
   Under an hour, mostly waiting on CI. **Ensure `.env.local` is gitignored
   before the first commit** — it holds the service-role key. *(Ops)*

## 🟡 Medium
2. **Landing page ships placeholder contact details.**
   `hello@aliamzdigital.example` / `+00 000 000 0000` are marked
   `TODO(aliamz)` in one constant ([components/marketing/landing.tsx]). Fine
   locally; deployed as-is, the primary CTA dead-ends. One-line fix, but it
   *must* happen before the landing page is public. *(Launch content)*
3. **In-memory rate limiter on serverless** *(carried from R7, unchanged).*
   `login` / `forgot-password` limits aren't shared across lambda instances;
   Supabase Auth's own limiting is the backstop. Upstash/Redis swap, call
   sites unchanged. *(Security / scale)*

## ⚪ Low (mostly deliberate deferrals — unchanged unless noted)
4. CSP `'unsafe-inline'`; nonce-based CSP is the upgrade. *(Security)*
5. Analytics aggregate in memory with row caps → move to SQL as tenants grow. *(Performance)*
6. No MFA / account lockout. *(Auth)*
7. Slug change leaves old `/s/<oldslug>` a 404, no 301. *(Multi-tenancy)*
8. No in-app signup — owners invited by staff (deliberate). Note: the invite
   email requires **Supabase SMTP to be configured** — see launch checklist. *(Product)*
9. `/api/**` not host-guarded on tenant domains (routes individually protected). *(Multi-tenancy)*
10. Apex-vs-subdomain DNS hint is a 2-label heuristic. *(Domains)*
11. `sitemap.xml` dynamic per host. *(Performance)*
12. Edge-Config-down mode serves without canonical 301s (deliberate stay-up trade-off). *(Routing)*
13. Impersonation banner only in `/admin`. *(UX)*
14. No payment provider — plans staff-assigned; `provider_*` columns ready for Stripe (by design). *(Billing)*
15. *(new)* `remotePatterns` allows any `**.supabase.co` project through the
    image optimizer, not only ours — negligible abuse value, tighten to the
    project ref if desired. A11y pass is engineering-verified, not yet
    screen-reader/axe-verified; an axe smoke check in CI would close that. *(Hardening)*

## By dimension
| Dimension | State |
|---|---|
| Architecture | ✅ Clean layering; every tenant service business-scoped — no exceptions left |
| Security | ✅ No open code High; isolation proven at DB + app layers (Low: #4, #15) |
| Multi-tenancy | ✅ 28 DB-level tests; impersonation gates, scoped claims, age-only purge |
| Platform / roles | ✅ Portal, per-action audit, authz-tested, one-command bootstrap |
| Billing / flags | ✅ Enforced everywhere + tested; Stripe deferred |
| Routing / Domains | ✅ Four entry points, host-aware SEO, apex now a real landing page |
| SEO / AI Visibility | ✅ Images now indexable with alt — the last content gap closed |
| Performance | ✅ Optimized images w/ hero preload; static landing; (Low: #5, #11) |
| Database | ✅ Retention live; seed + documented rollback policy |
| Accessibility | ✅ AA pass on public template + landing (verify with axe/SR → #15) |
| Testing | ✅ **229 tests** (201 unit + 28 DB) — but CI has never run → #1 |
| Deployment / Ops | 🟠 **#1: no version control; CI aspirational until pushed** |

---

## Launch checklist (operational, not scored)
1. `git init` + push + connect Vercel (**resolves #1**; CI proves the chain).
2. Apply migrations **0011–0018** to production Supabase (0017/0018 are
   load-bearing: `claimDue` and retention error without them).
3. `npm run seed -- --admin-email <you>` → super admin without UUID surgery.
4. Real contact details in the landing page (**resolves #2**).
5. Production env on Vercel **before first build** (`NEXT_PUBLIC_*` are inlined
   at build): Supabase keys, `CRON_SECRET` (both jobs 401 without it),
   `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_SITE_URL`; leave
   `DEV_BUSINESS_SLUG` **unset** so the apex serves the landing page.
6. Configure **Supabase SMTP** — owner invites (`/platform/businesses/new`)
   send email; without SMTP that flow stalls.
7. Optional hardening, in order of value: Upstash rate limiter (#3), axe check
   in CI (#15), nonce CSP (#4).

## Why 94
The application is production-ready: isolation is proven at two layers, every
paid feature is enforced, staff actions are attributable, growth is bounded by
retention, images and accessibility meet the bar, and both test modes plus
build and smoke are green (229 tests). The deductions are one honest ops High
(nothing protects or exercises this code outside one machine) and one
launch-content Medium — both fixable in an afternoon, neither requiring another
line of application code.
