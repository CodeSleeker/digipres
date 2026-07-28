# Production Readiness Review — Round 4

**Date:** 2026-07-23
**Scope:** Re-audit after the multi-tenant routing work (custom domains, steps a–e).
Reports only issues that **remain**.
**Score:** **85 / 100** — 🟢 **Ready to launch on platform subdomains**, 🟠 **not
yet ready to onboard customers onto their own domains.**
**0 Critical · 1 High · 6 Medium · 8 Low.**

## Verdict (split, because the two launch paths differ)
- **Platform-subdomain launch** (`<slug>.platform.com`): still green, as in Round 3.
  Nothing regressed — the routing work is additive and degrades to previous
  behavior when Edge Config / `business_domains` are absent.
- **Custom-domain launch** (`roniesbarber.com`): **hold**. Three findings are
  specific to serving customer-owned domains — one High, two Medium — and should
  be fixed before the first customer points DNS at us.

The score dipped from 89 because adding custom domains added surface. The
capability is complete and proven (all four entry points resolve to one Business,
verified at the DB); what's missing is per-host polish.

---

## Resolved / added since Round 3
Custom-domain routing end-to-end: `business_domains` table with anti-hijack
uniqueness, Edge Config resolution, alias→primary 301s, `/s/<slug>` no longer
publicly exposed, Vercel provisioning, admin Domains UI, and **12 DB-level RLS
tests** — including proof that an owner **cannot self-verify** a hostname.

---

## 🔴 Critical — none

## 🟠 High
1. **`robots.txt` and `sitemap.xml` are not host-aware.**
   `app/robots.ts` is statically prerendered and hardcodes
   `Sitemap: ${SITE_URL}/sitemap.xml`; `app/sitemap.ts` lists **every** tenant's
   canonical URL. So `roniesbarber.com/sitemap.xml` serves a sitemap listing
   *all other customers' domains*, and its robots.txt points at the platform's
   sitemap.
   *Impact:* invalid SEO for the customer (a sitemap on domain X listing domain Y
   is ignored), plus cross-customer exposure of your client list on their own
   site. *Fix:* make both host-aware — per-tenant sitemap containing only that
   tenant's URLs, robots referencing the tenant's own sitemap. *(SEO / Privacy)*

## 🟡 Medium
2. **Admin, auth and API are reachable on tenant custom domains.**
   `proxy.ts` routes `/admin`, `/login`, `/auth`, `/api` by path regardless of
   host, so `roniesbarber.com/admin` serves the platform dashboard and login.
   Unprofessional, a phishing surface, and it scopes auth cookies to the
   customer's domain. *Fix:* restrict those paths to the platform host; 404 or
   redirect them on tenant domains. *(Security / Multi-tenancy)*
3. **An unresolved host falls back to the demo profile.**
   If Edge Config is unreachable, a custom domain resolves to `null` →
   passthrough → `/` → `loadBusinessProfile()` → the **static `ronies` default**.
   A customer's domain would render a demo site during an outage. *Fix:* render
   404 (or a neutral page) for unknown hosts on the apex route, and/or add a DB
   fallback lookup when Edge Config misses. *(Resilience)*
4. **Content images unoptimized / not indexable** (deferred by decision) — still
   CSS backgrounds, no `next/image`, no `alt`. Best done with a Storage
   upload+transform pipeline. *(Performance / SEO / A11y)*
5. **Accessibility not verified to WCAG AA** — contrast, hover-only captions,
   focus states, image alt. Needs an axe/Lighthouse pass. *(A11y)*
6. **`review_messages` retention** — the queue grows unbounded. *(Database/scale)*
7. **Migration reproducibility remainder** — CI applies migrations to real
   Postgres (good), but there's no seed script and no down/rollback migrations. *(Ops)*

## ⚪ Low
8. CSP still uses `'unsafe-inline'` (nonce-based CSP is the upgrade). *(Security)*
9. Rate limiter is in-memory/per-instance — back with Upstash/Redis. *(Security/scale)*
10. Analytics aggregates in memory (5000-row cap). *(Performance)*
11. No MFA / account lockout. *(Auth)*
12. Changing a business slug leaves the old `/s/<oldslug>` 404 with no redirect. *(Multi-tenancy)*
13. No in-app signup — owners provisioned via Supabase. *(Auth/Product)*
14. Apex detection for DNS hints is a 2-label heuristic (wrong for `foo.co.uk`);
    the provider's own challenge records are authoritative. *(Domains)*
15. `npm audit`: dev-only advisories (Vitest/pg transitive). *(Deployment)*

## By dimension
| Dimension | State |
|---|---|
| Architecture | ✅ Strong |
| Security | 🟡 Strong core; platform paths exposed on tenant domains (#2) |
| Performance | 🟡 Cached; images unoptimized (#4) |
| Multi-tenancy | ✅ **Proven at DB** — 12 RLS tests incl. anti-hijack (Low: #12) |
| Routing / Domains | ✅ All four entry points; per-host SEO gaps (#1) |
| SEO | 🟠 Canonical/JSON-LD done; robots+sitemap not host-aware (#1) |
| AI Visibility | ✅ |
| Database | ✅ (residual: retention #6, seed/rollback #7) |
| Authentication | ✅ (Low: MFA #11, signup #13) |
| Review Automation | ✅ scheduled, atomic, idempotent |
| SMS | ✅ Twilio + opt-out/consent/E.164 |
| Google Business | ✅ by design |
| Testing | ✅ Strong — 70 tests incl. 12 DB-level RLS |
| Deployment | ✅ health, cron, headers, Node pin, CI w/ Postgres |
| Accessibility | 🟡 needs a verified AA pass (#5) |

---

## Next phase — Phase 3

**P3.1 — Custom-domain readiness (do before the first customer domain)**
1. Host-aware `robots.txt` + per-tenant `sitemap.xml` (High #1).
2. Restrict `/admin`, `/login`, `/auth`, `/api` to the platform host (Medium #2).
3. Safe unknown-host behavior: 404 instead of the demo profile; optional DB
   fallback when Edge Config misses (Medium #3).

**P3.2 — Quality fast-follows**
4. Accessibility to WCAG AA (#5).
5. Image pipeline via Supabase Storage + `next/image` (#4).
6. Queue retention + seed/down migrations (#6, #7).

**P3.3 — Hardening**
7. Nonce-based CSP (#8), Upstash-backed rate limiting (#9), MFA (#11),
   slug-change redirects (#12).

## Why the platform-subdomain path is still production-ready
No Critical or High findings apply to it: tenant isolation is proven at the
database, the core loop runs/sends/complies, SEO/AI output ships, and security,
caching, observability and CI are in place. The High and two Mediums above are
scoped strictly to serving customer-owned domains, which is opt-in per tenant.
