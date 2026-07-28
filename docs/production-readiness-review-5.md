# Production Readiness Review — Round 5

**Date:** 2026-07-23
**Scope:** Re-audit after P3.1 (custom-domain readiness). Reports only issues that **remain**.
**Score:** **91 / 100** — 🟢 **Production-ready for both launch paths** (platform
subdomains *and* customer custom domains), conditional on the go-live checklist.
**0 Critical · 0 High · 4 Medium · 10 Low.**

## Verdict
Round 4 split the verdict because custom domains weren't safe to sell. That gap
is closed: the High and both domain-specific Mediums are resolved and verified.
What remains is the same quality backlog that predates the routing work —
accessibility, image optimization, retention, migration ergonomics — none of
which blocks a launch. **Accessibility is the one I'd complete before broad
public marketing**, for legal as much as UX reasons.

---

## Resolved since Round 4
- **High #1 — host-aware SEO.** `robots.txt` and `sitemap.xml` now vary by host.
  A customer's domain lists **only their own site**; the apex lists itself plus
  tenants on platform subdomains. Pinned by 5 unit tests.
- **Medium #2 — platform paths off customer domains.** `/admin`, `/login`,
  `/forgot-password`, `/reset-password`, `/auth/**` now 307 to the platform host
  when requested on a tenant domain. Fails open when unconfigured.
- **Medium #3 — no demo-site fallback.** An unmapped domain returns a 404
  ("this domain isn't connected yet") instead of silently serving the default
  template — **plus** a cached PostgREST fallback so tenant sites stay up if
  Edge Config is stale or unreachable.

Test suite: **88 total** (76 unit + 12 DB-level RLS).

---

## 🔴 Critical — none
## 🟠 High — none

## 🟡 Medium (quality backlog — none block launch)
1. **Content images unoptimized / not indexable** *(deferred by decision)* —
   still CSS backgrounds: no `next/image`, no `alt`, not crawlable as images.
   Best done as a Supabase Storage upload+transform pipeline (real optimization
   + safe hosts) rather than a blind template rewrite. *(Performance / SEO / A11y)*
2. **Accessibility not verified to WCAG AA** — colour contrast (e.g. `#888` on
   dark), hover-only gallery captions, focus states, image alt text. Needs an
   axe/Lighthouse pass and fixes. **Top recommended fast-follow.** *(A11y)*
3. **`review_messages` retention** — the queue grows unbounded; add archival of
   old terminal rows (a step in the existing cron). *(Database / scale)*
4. **Migration reproducibility remainder** — CI applies every migration to real
   Postgres (good), but there's still no local **seed script** and no
   **down/rollback** migrations. *(Ops)*

## ⚪ Low
5. CSP still uses `'unsafe-inline'` (nonce-based CSP is the upgrade). *(Security)*
6. Rate limiter is in-memory/per-instance — back it with Upstash/Redis. *(Security / scale)*
7. Analytics aggregates in memory (5000-row cap). *(Performance)*
8. No MFA / account lockout. *(Auth)*
9. Changing a business slug leaves the old `/s/<oldslug>` 404 with no redirect. *(Multi-tenancy)*
10. No in-app signup — owners are provisioned via Supabase. *(Auth / Product)*
11. `/api/**` is **not** host-guarded on tenant domains (excluded by the
    middleware matcher, by design). Each route is individually protected
    (CRON_SECRET, Twilio signature, `requireUser`), so impact is disclosure-only. *(Multi-tenancy)*
12. Apex-vs-subdomain DNS hint uses a 2-label heuristic (wrong for `foo.co.uk`);
    the provider's own challenge records are authoritative. *(Domains)*
13. `sitemap.xml` is now dynamic per host (no longer statically cached) — one DB
    query per request on the apex. Fine at crawler frequency; add per-host
    caching if it ever matters. *(Performance)*
14. Degraded mode (Edge Config down) serves the requested host without
    canonical 301s — a deliberate "stay up over stay canonical" trade-off. *(Routing)*

## By dimension
| Dimension | State |
|---|---|
| Architecture | ✅ Strong |
| Security | ✅ Strong (residual: CSP nonce #5, distributed rate-limit #6) |
| Performance | 🟡 Cached + ISR; images unoptimized (#1) |
| Multi-tenancy | ✅ **Proven at DB**; platform paths guarded (Low: #9, #11) |
| Routing / Domains | ✅ Four entry points, host-aware SEO, outage fallback |
| SEO | ✅ Canonical, JSON-LD, per-host robots + sitemap |
| AI Visibility | ✅ |
| Database | ✅ (residual: retention #3, seed/rollback #4) |
| Authentication | ✅ (Low: MFA #8, signup #10) |
| Review Automation | ✅ scheduled, atomic-claim, idempotent |
| SMS | ✅ Twilio + opt-out/consent/E.164 |
| Google Business | ✅ by design |
| Testing | ✅ Strong — 88 tests incl. 12 DB-level RLS |
| Deployment | ✅ health, cron, headers, Node pin, CI w/ Postgres |
| Accessibility | 🟡 needs a verified AA pass (#2) |

---

## Go-live checklist (deploy-time config)
- [x] Migrations `0001`–`0009` applied. **[ ] Apply `0010`** (business_domains).
- [ ] Core env: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
- [ ] SMS: `TWILIO_*`, `SMS_DEFAULT_COUNTRY_CODE`, `TWILIO_WEBHOOK_URL`.
- [ ] **Domains:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`,
      `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID` (+`VERCEL_TEAM_ID`),
      `EDGE_CONFIG`, `EDGE_CONFIG_ID`; add the `*.<root-domain>` **wildcard
      domain** to the Vercel project.
      ⚠️ `NEXT_PUBLIC_*` are read at **build** time — set them in the Vercel
      project *before* building, or the values won't take effect.
- [ ] Supabase Auth: **Confirm email ON**; `${SITE_URL}/auth/callback` in Redirect URLs.
- [ ] Twilio: Messaging Service with Advanced Opt-Out; inbound webhook → `/api/sms/inbound`.
- [ ] Vercel **Pro** (15-min cron); uptime monitor → `/api/health`.
- [ ] Browser-verify CSP on admin flows; run a Lighthouse/axe pass.

## Next phase — Phase 4 (all optional, post-launch)
1. **Accessibility to WCAG AA** (Medium #2) — recommended first.
2. **Image pipeline**: Supabase Storage + `next/image` (Medium #1).
3. Queue retention + seed/down migrations (#3, #4).
4. Hardening: nonce CSP (#5), Upstash rate limiting (#6), MFA (#8),
   slug-change redirects (#9).

## Why it's production-ready
Zero Critical and zero High findings. Tenant isolation is **proven at the
database** (12 RLS tests, including that an owner cannot self-verify a hostname);
the core review→SMS loop runs, sends and complies; SEO/AI output ships per host;
custom domains are provisioned, canonicalized, guarded and resilient to an Edge
Config outage; and CI gates every change with 88 tests, a real Postgres, a build
and an end-to-end smoke test. Everything remaining is quality polish that is
safe to ship incrementally.
