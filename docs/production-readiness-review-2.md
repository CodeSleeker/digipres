# Production Readiness Review — Round 2

**Date:** 2026-07-22
**Scope:** Re-audit after Phase 1. Reports only issues that **remain** — resolved
findings are listed once (below) and not repeated.
**Score:** **72 / 100** — 🟠 **Not production-ready for public/commercial launch.**
**0 Critical**, **5 High**, **12 Medium**, **7 Low**. The dangerous class (tenant
breach, data loss, double-send) is cleared; what remains is core-feature
completion (SMS delivery, scheduler wiring, SEO output) and launch hardening.

## Resolved since Round 1 (not re-audited)
- ✅ Migrations `0001`–`0008` applied (re-verified: `claimed_at` + `claim_due_review_messages` present).
- ✅ SMS double-send → atomic claim (`FOR UPDATE SKIP LOCKED`, migration 0008).
- ✅ CMS/onboarding edits revalidate the correct `/s/[slug]` tenant page.
- ✅ Email confirmation enforced (Supabase setting + app-layer guard).
- ✅ Automated tests (RLS isolation, scheduler idempotency) + GitHub Actions CI.
- ✅ Multi-tenant isolation (RLS + service + repository), verified.

## Severity legend
🔴 Critical (breach/data-loss/harm) · 🟠 High (blocks core value or real risk) ·
🟡 Medium · ⚪ Low.

---

## 🔴 Critical
**None.** Tenant isolation is enforced at three layers and verified; there is no
cross-tenant, data-loss, or double-send path remaining.

## 🟠 High (block a public commercial launch)

1. **Review-automation scheduler is never invoked.** The processor route
   `app/api/jobs/review-automation/route.ts` exists but nothing triggers it —
   there is no `vercel.json` cron, Trigger.dev job, or external scheduler. In
   production the queue would fill and **no message ever sends**. *(Deployment /
   Review Automation)*

2. **SMS sender is a stub.** `getSmsSender()` returns `LogSmsSender`, which logs
   and reports success — messages are marked **`sent` without anything leaving
   the server**. Owners believe customers were texted when they weren't. A real
   carrier (Twilio) must be wired before launch. *(SMS)*

3. **No SMS compliance controls.** No inbound **STOP/opt-out** handling and no
   consent capture. The `sms_status: opted_out` enum exists but nothing sets it
   from an unsubscribe. The moment a real carrier is connected this is a legal
   (TCPA/CTIA) exposure. *(SMS)*

4. **Core SEO / AI-visibility output is missing.** No `app/robots.ts`, no
   `app/sitemap.ts`, no `metadataBase`/canonical, and **no JSON-LD** anywhere
   (Organization / LocalBusiness / FAQ). The product's headline promise —
   discoverability and AI visibility — is not delivered, and the same tenant is
   reachable at `/`, `/s/[slug]`, and a subdomain with no canonical (duplicate
   content). *(SEO / AI Visibility)*

5. **Stored CSS injection via image URLs.** Owner-supplied URLs are interpolated
   raw into inline styles: `style={{ backgroundImage: \`url('${item.image}')\` }}`
   (`templates/barber/luxury/components/gallery-item.tsx`, `sections/hero.tsx`).
   A value with `')` breaks out of `url()` and injects arbitrary CSS. Blast
   radius is one tenant's own page (isolation holds), but it's unvalidated
   output. *Fix:* validate URLs in the Zod schemas / use `next/image`. *(Security)*

## 🟡 Medium

6. **No security headers.** `next.config.ts` is empty — no CSP, HSTS,
   X-Frame-Options, X-Content-Type-Options, Referrer-Policy. *(Security)*
7. **Images unoptimized.** CSS backgrounds, no `next/image`, no lazy/responsive
   loading → poor LCP/CLS and not indexable. *(Performance / SEO)*
8. **Public pages fully dynamic.** The tenant loader reads cookies via the
   server client, forcing per-request DB reads with no caching. *(Performance)*
9. **No password-reset flow.** Owners who forget a password can't recover. *(Auth)*
10. **Business-entity edits don't revalidate the public page.**
    `features/business/actions.ts` (name/slug/description feed the site) still
    only `revalidatePath("/admin")` — the same staleness class fixed for CMS in
    Phase 1, in a different feature. *(Multi-tenancy)*
11. **No DB-level RLS test.** The suite covers application-layer scoping; there is
    no integration test proving Postgres RLS denies a real cross-tenant read.
    *(Testing)*
12. **Unbounded `review_messages` queue.** No retention/archival of terminal
    rows. *(Database)*
13. **No rollback migrations, seed, or migration step in CI.** Applying is
    manual and irreversible. *(Database / Deployment)*
14. **No observability.** Errors are `console.error` only — no structured logs,
    error tracking, or `/health` endpoint. *(Deployment)*
15. **Node not pinned.** `package.json` `engines` is empty; only CI uses 22.
    Local/prod can drift onto the deprecated Node 20. *(Deployment)*
16. **No rate limiting** on login or the cron route. *(Security)*
17. **Customer mobile numbers unvalidated.** Free-text, no E.164 normalization →
    send failures and compliance gaps once SMS is live. *(SMS / Data)*

## ⚪ Low
18. Cron secret compared non-constant-time (`route.ts`). *(Security)*
19. Analytics aggregates in memory (5000-row cap). *(Performance)*
20. No MFA / account lockout / explicit session-timeout policy. *(Auth)*
21. Slug change leaves old `/s/[oldslug]` 404 with no redirect. *(Multi-tenancy)*
22. Admin is reachable on any host (incl. tenant subdomains); not locked to an
    `app.` host. *(Multi-tenancy)*
23. Duplicate `requireUser` (`features/business/actions.ts` vs
    `lib/auth/require-user.ts`); static `lib/businesses` fallback lingers. *(Architecture)*
24. `npm audit`: dev-only advisories in Vitest's transitive deps (not shipped). *(Deployment)*

## By dimension — quick read
| Dimension | State | Note |
|---|---|---|
| Architecture | ✅ Strong | Clean layering; minor dup (Low 23) |
| Security | 🟠 | Image-URL injection (H5), headers (M6), rate limits (M16) |
| Performance | 🟡 | Images (M7), dynamic pages (M8) |
| Multi-tenancy | ✅ Strong | Isolation solid; edit-revalidation gap (M10) |
| SEO | 🟠 | robots/sitemap/canonical/JSON-LD all missing (H4) |
| AI Visibility | 🟠 | Structured data missing (H4) |
| Database | 🟡 | Applied ✅; retention (M12), rollback/seed (M13) |
| Authentication | 🟡 | Confirmed ✅; reset (M9), MFA/lockout (L20) |
| Review Automation | 🟠 | Logic correct ✅; not scheduled (H1) |
| SMS | 🔴-adjacent 🟠 | Stub sender (H2), no opt-out/consent (H3), no E.164 (M17) |
| Google Business | ✅ | Wizard + tracking; Google APIs intentionally excluded (by design) |
| Testing | 🟡 | Unit+smoke+CI ✅; no DB RLS test (M11) |
| Deployment | 🟠 | No scheduler (H1), headers (M6), Node pin (M15), observability (M14) |

---

## Why it's not production-ready
The **foundation is production-grade**: tenant isolation, auth, data correctness,
and the review-automation race are all resolved and tested. But three of the
product's **core value features are incomplete**: review automation never runs
(no scheduler), SMS doesn't actually send (stub) and isn't compliant, and the
SEO/AI-visibility output the platform sells doesn't exist yet. Shipping now would
under-deliver the headline promises. No Critical issues remain, so a **controlled
private beta** (websites + CRM + dashboards, SMS disabled) is viable today.

---

## Next phase — Phase 2: Launch Readiness

**P2.1 — Make the core loop actually run (High 1–3)**
- Add `vercel.json` cron (or Trigger.dev job) to hit the processor on a schedule.
- Implement a Twilio-backed `SmsSender`; keep the stub as the no-key fallback.
- Add inbound STOP/opt-out handling (sets `sms_status = opted_out`, suppresses
  sends) and record consent. Normalize numbers to E.164 (M17).

**P2.2 — Deliver SEO / AI visibility (High 4)**
- `app/robots.ts` (+ disallow `/admin`, `/api`) and `app/sitemap.ts` (active
  tenant slugs). Set `metadataBase` + per-page canonical.
- Emit Organization + LocalBusiness JSON-LD (and FAQPage once an FAQ section
  exists). Flip the in-app AI-Visibility `PLATFORM` flags as each lands.

**P2.3 — Security & performance hardening (High 5, Medium 6–8)**
- Validate/sanitize image URLs in the Zod schemas (or move to `next/image`).
- Add security headers (CSP first) via `next.config.ts`.
- `next/image` for content images; ISR/tag caching for `/s/[slug]`.

**P2.4 — Operational readiness (Medium 9–17)**
- Password-reset flow; revalidate the public page on business-entity edits.
- Pin Node 22 (`engines` + `.nvmrc`); add `/health`, error tracking, structured
  logs; queue retention job.
- Add a real DB-level RLS integration test (two users, cross-tenant denied).

Recommend tackling **P2.1 → P2.2 → P2.3 → P2.4**, one item at a time with the
same approval gates as Phase 1.
