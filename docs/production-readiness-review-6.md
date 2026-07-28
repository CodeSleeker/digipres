# Production Readiness Review — Round 6

**Date:** 2026-07-23
**Scope:** Re-audit after the platform phases (P1–P8): roles, audit log,
business-scoped context, super admin portal, staff onboarding, impersonation,
templates/brand, plans & feature flags, analytics & health.
**Score:** **86 / 100** — 🟠 **The tenant product remains launch-ready; the new
platform/billing layer has one gap to close before charging anyone.**
**0 Critical · 1 High · 7 Medium · 13 Low.**

## Verdict
Round 5 (91) covered the tenant-facing product, which is unchanged and still
sound. Since then the platform gained a large new surface — cross-tenant reads,
a service-role onboarding path, impersonation, and entitlement gating. Most of it
is solid and DB-enforced, but **feature gating is enforced in only one place**,
which undermines the billing model it was built for. That's the High, and it is
a finding against work completed this session.

---

## 🔴 Critical — none

## 🟠 High
1. **Entitlement gating is enforced on one page and one action.**
   `requireFeature` / `featureError` are wired only to `/admin/appointments` and
   `createAppointment`. Everything else relies on the **nav link being hidden**,
   which is not a control:
   - `/admin/ai-messages` — a Starter tenant can open it by URL and consume AI
     provider credits (`ai_messages` is a paid feature)
   - `/admin/domains` (`custom_domains`), `/admin/analytics` (`analytics`),
     `/admin/reviews` (`reviews`)
   - `updateAppointment` / `deleteAppointment`, and the appointments
     `new` / `[id]/edit` / `calendar` pages
   *Impact:* trivially exploitable paid-feature bypass (type the URL) with real
   cost attached for AI. No data leak. *Fix:* apply the guard to every gated page
   and mutating action — the helpers already exist. *(Billing / Security)*

## 🟡 Medium
2. **Impersonation records the session, not the actions.** Start and end are
   audited, so every window in which staff could touch a tenant is attributable,
   but individual mutations inside that window are not. For a support tool that
   reaches customer PII, per-action entries are the standard. *(Audit)*
3. **Two service-role paths bypass RLS, with thin app-layer test cover.**
   Impersonation and staff onboarding both use service-role, so during those the
   **business-scoping in the services is the only guard**. Only `CustomerService`
   has scoping tests; the other six services are untested at that layer.
   *(Security / Testing)*
4. **Unbounded tables.** `review_messages`, and now `audit_log` and `job_runs`,
   all grow forever. Retention/archival is needed for all three. *(Database/scale)*
5. **Content images unoptimized / not indexable** *(deferred by decision)* — no
   `next/image`, no `alt`, not crawlable. *(Performance / SEO / A11y)*
6. **Accessibility not verified to WCAG AA** — contrast, hover-only captions,
   focus states, alt text. **Still the top pre-launch quality item.** *(A11y)*
7. **Migration reproducibility.** CI applies all migrations to real Postgres
   (good), but there is still no seed script and no down/rollback migrations —
   now across 16 migrations. *(Ops)*
8. **The platform portal has no app-layer authorization tests**, and `/platform`
   isn't in the smoke test. The DB policies are tested; `requirePlatformAdmin`
   and `requirePlatformWriter` are not. *(Testing)*

## ⚪ Low
9. CSP still uses `'unsafe-inline'` (nonce-based CSP is the upgrade). *(Security)*
10. Rate limiter is in-memory/per-instance. *(Security/scale)*
11. Analytics (tenant and platform) aggregate in memory with row caps — the first
    thing to move to SQL aggregation as tenants grow. *(Performance)*
12. No MFA / account lockout. *(Auth)*
13. Slug change leaves the old `/s/<oldslug>` 404 with no redirect. *(Multi-tenancy)*
14. No in-app signup — owners are invited by staff (now a deliberate flow). *(Product)*
15. `/api/**` is not host-guarded on tenant domains (routes are individually
    protected). *(Multi-tenancy)*
16. Apex-vs-subdomain DNS hint is a 2-label heuristic. *(Domains)*
17. `sitemap.xml` is dynamic per host (one query per request on the apex). *(Performance)*
18. Degraded mode (Edge Config down) serves the requested host without canonical
    301s — a deliberate stay-up-over-stay-canonical trade-off. *(Routing)*
19. First platform admin must be inserted by hand via SQL. *(Ops)*
20. Impersonation banner appears only in `/admin`; an active session isn't
    signposted elsewhere. *(UX)*
21. No payment provider — plans are assigned by staff (by design). *(Billing)*

## By dimension
| Dimension | State |
|---|---|
| Architecture | ✅ Strong — clean layering, business-scoped services |
| Security | 🟠 Strong isolation; feature-gate bypass (#1), service-role blast radius (#3) |
| Multi-tenancy | ✅ **Proven at DB** — 21 RLS tests incl. anti-hijack + platform reads |
| Platform / roles | ✅ Roles, audit, portal, impersonation all DB-gated (Medium: #2, #8) |
| Billing / flags | 🟠 Model + resolution are sound and tested; enforcement incomplete (#1) |
| Routing / Domains | ✅ Four entry points, host-aware SEO, outage fallback |
| SEO / AI Visibility | ✅ |
| Database | 🟡 (retention #4, seed/rollback #7) |
| Authentication | ✅ (Low: MFA, signup) |
| Review Automation | ✅ scheduled, atomic-claim, idempotent, now observable |
| SMS | ✅ Twilio + opt-out/consent/E.164 |
| Testing | ✅ Strong — 131 tests incl. 21 DB-level RLS (gaps: #3, #8) |
| Deployment | ✅ health page, cron, headers, Node pin, CI w/ Postgres |
| Accessibility | 🟡 needs a verified AA pass (#6) |

---

## Next phase — P9: close the platform gaps
1. **Apply the feature guard everywhere** (High #1) — every gated page and every
   mutating action. Add a test asserting a disabled feature is refused by the
   action, not just hidden.
2. **Per-action audit during impersonation** (#2).
3. **Scoping tests for the remaining six services** (#3) — cheap, and they are
   the only guard while service-role is in play.
4. **Retention** for `review_messages`, `audit_log`, `job_runs` (#4).
5. **Platform authorization tests + `/platform` in the smoke test** (#8).

Then the standing quality backlog: **accessibility to WCAG AA** (#6), the image
pipeline (#5), and seed/rollback migrations (#7).

## Why the tenant product is still launch-ready
Nothing in P1–P8 weakened tenant isolation: the platform read policies are
additive and SELECT-only, owner policies are untouched, and 21 database-level
tests still pass — including that an owner cannot self-verify a domain, cannot
grant themselves platform access, and cannot write another tenant's data. The
High is a **billing-enforcement** gap, not an isolation one.
