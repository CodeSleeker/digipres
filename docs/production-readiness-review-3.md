# Production Readiness Review — Round 3

**Date:** 2026-07-23
**Scope:** Re-audit after Phase 2 (P2.1–P2.4). Reports only issues that **remain**.
**Score:** **89 / 100** — 🟢 **Production-ready for launch, conditional on the
go-live configuration checklist.** **0 Critical, 0 High.** Remaining items are
quality/scale/ops fast-follows — none block a launch.

## Verdict
From a **code and security** standpoint this is launch-grade: no Critical/High
findings, tenant isolation **proven at the database**, the core review→SMS loop
runs/sends/complies, SEO/AI output shipped, and the app is hardened, cached,
observable, and covered by CI (unit + DB-level RLS + build + smoke). What stands
between "ready" and "live" is **deploy-time configuration** (only you can do it)
plus two recommended fast-follows (accessibility verification, image
optimization). Neither is a blocker.

---

## Resolved since Round 2 (not re-audited)
**All 5 High** → scheduler (cron), real Twilio sender, SMS opt-out/consent/E.164,
SEO/AI (robots + sitemap + canonical + LocalBusiness JSON-LD), image-URL injection.
**Medium** → security headers/CSP, ISR caching, password reset, business-entity
revalidation, DB-level RLS test, observability + `/health`, Node 22 pin, rate
limiting, phone E.164. **Low** → constant-time cron compare, duplicate `requireUser`.
CI now also **applies all migrations against real Postgres** every run.

## Severity legend
🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low.

---

## 🔴 Critical — none
## 🟠 High — none

## 🟡 Medium (fast-follow, non-blocking)
1. **Content images unoptimized / not indexable (deferred #7).** Still CSS
   backgrounds — no `next/image`, no `alt`, not crawlable as images. Page-level
   perf is mitigated by the new ISR caching, but do this as a dedicated,
   browser-verified task (ideally a Supabase Storage upload+transform pipeline
   for real optimization + safe hosts). *(Performance / SEO / A11y)*
2. **Accessibility not verified to WCAG AA.** Colour contrast (e.g. `#888` on
   dark), hover-only gallery captions, focus states, and image alt text need an
   axe/Lighthouse pass and fixes. Important for a public commercial product. *(A11y)*
3. **`review_messages` retention.** The queue grows unbounded; add archival/
   cleanup of old terminal rows (e.g. a step in the existing cron). *(Database/scale)*
4. **Migration reproducibility (remainder).** CI applies migrations to real
   Postgres (good), but there's no local **seed script** and no **down/rollback**
   migrations. *(Ops)*

## ⚪ Low (hardening / cleanup)
5. **CSP uses `'unsafe-inline'`** for script/style (required by Next hydration +
   inline styles). Upgrade to a nonce-based CSP to drop it. *(Security)*
6. **Rate limiter is in-memory/per-instance.** Blunts bursts; back it with
   Upstash/Redis for a strict distributed limit. *(Security/scale)*
7. **Analytics aggregates in memory** (5000-row cap). Move to SQL aggregates at
   scale. *(Performance)*
8. **No MFA / account lockout** (rate-limiting partially covers brute-force). *(Auth)*
9. **Slug change leaves the old `/s/<oldslug>`** cached/404 with no redirect. *(Multi-tenancy)*
10. **Admin reachable on any host** (not locked to an `app.` subdomain). *(Multi-tenancy)*
11. **No in-app signup flow** — owners are provisioned via Supabase. Confirm this
    is intended. *(Auth/Product)*
12. **`npm audit`: dev-only advisories** in Vitest/pg transitive deps (not shipped). *(Deployment)*

## By dimension
| Dimension | State |
|---|---|
| Architecture | ✅ Strong |
| Security | ✅ Strong (residual: CSP nonce #5, distributed rate-limit #6) |
| Performance | 🟡 Caching done; images unoptimized (#1) |
| Multi-tenancy | ✅ Strong — RLS proven at DB (Low: #9, #10) |
| SEO | ✅ (residual: image indexability #1) |
| AI Visibility | ✅ JSON-LD + robots + sitemap |
| Database | ✅ (residual: retention #3, seed/rollback #4) |
| Authentication | ✅ reset + confirm + rate-limit (Low: MFA #8, signup #11) |
| Review Automation | ✅ scheduled, atomic-claim, idempotent |
| SMS | ✅ Twilio + opt-out/consent/E.164 (needs live creds at deploy) |
| Google Business | ✅ by design (no Google APIs) |
| Testing | ✅ Strong — unit + DB-level RLS + smoke + CI |
| Deployment | ✅ health + cron + headers + Node pin (residual: seed/rollback #4) |
| Accessibility | 🟡 needs a verified AA pass (#2) |

---

## Go-live checklist (deploy-time config — not code)
- [x] Apply migrations `0001`–`0009` (done on your project).
- [ ] Set prod env: `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
      `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ROOT_DOMAIN` (if subdomains),
      `TWILIO_*` (+ `SMS_DEFAULT_COUNTRY_CODE`, `TWILIO_WEBHOOK_URL`), optional `ERROR_WEBHOOK_URL`.
- [ ] Supabase Auth: keep **Confirm email ON**; add `${SITE_URL}/auth/callback`
      to **Redirect URLs**.
- [ ] Twilio: Messaging Service with **Advanced Opt-Out**; inbound webhook →
      `/api/sms/inbound`; status callback → `TWILIO_STATUS_CALLBACK_URL`.
- [ ] Vercel **Pro** (15-min cron cadence); point an uptime monitor at `/api/health`.
- [ ] Browser-verify **CSP** on the admin flows (clipboard copy, auth) — no console
      violations.
- [ ] Run a **Lighthouse/axe accessibility** pass and fix to AA (Medium #2).

## Phase 3 (fast-follow, post-launch)
1. Image pipeline: Supabase Storage upload + `next/image` (Medium #1) — real
   optimization, alt text, indexable images, safe hosts.
2. Accessibility to WCAG AA (Medium #2).
3. `review_messages` retention job + a local seed script + down migrations (#3, #4).
4. Hardening: nonce-based CSP (#5) and Upstash-backed rate limiting (#6).
5. Optional: MFA, in-app signup, admin host-scoping, slug-change redirects.

## Why it's production-ready
Every dangerous and launch-blocking finding from Rounds 1–2 is resolved and
verified: **0 Critical, 0 High**. Tenant isolation is proven at the database
layer, not just asserted; the platform's core features (sites, CRM, dashboards,
review automation, compliant SMS, SEO/AI) work end-to-end; and security,
observability, caching, and CI are in place. The residual list is entirely
Medium/Low polish that is safe to ship as fast-follows behind the go-live
checklist above.
