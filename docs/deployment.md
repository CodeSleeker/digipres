# Production Deployment

Target architecture: **Vercel** (app + cron + image optimization + tenant
domains) · **Supabase** (Postgres/RLS + Auth + SMTP) · **Cloudflare** (DNS).
Follow in order; each step says how to verify it.

---

## 1. Repository

The project must live in a git repository for CI and Vercel to work.

```bash
git init
git add .
git status        # MUST NOT list .env.local (the service-role key)
git commit -m "Initial commit"
```

Create a **private** GitHub repo, push. Verify: the **CI workflow runs green**
on the push — types, lint, all tests (incl. DB-level RLS against a Postgres
container), build, smoke.

## 2. Supabase (production project)

Use a **separate** Supabase project from local dev.

1. **Migrations:** apply [supabase/migrations/](../supabase/migrations/)
   `0001` → `0018` in order (SQL Editor, or `supabase link` + `db push`).
   `0017`/`0018` are load-bearing — message claiming and retention error
   without them.
2. **Auth hardening** (Authentication → Settings): confirm **email
   confirmations** are required; set the **Site URL** to your production URL.
3. **SMTP** (Authentication → SMTP): configure a real sender (Resend,
   Postmark, SES…). Owner invites from `/platform/businesses/new` are email —
   **without SMTP that flow stalls silently.**
4. Note the values for step 3: Project URL, `anon` key, `service_role` key.

## 3. Vercel project + environment

Import the GitHub repo into Vercel. **Set every env var BEFORE the first
build** — `NEXT_PUBLIC_*` values are inlined at build time; changing them
later requires a redeploy.

| Variable                                                                    | Value / note                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                                  | production project URL                                                                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                             | production anon key                                                                                     |
| `SUPABASE_SERVICE_ROLE_KEY`                                                 | production service key — **server-only secret**                                                         |
| `NEXT_PUBLIC_ROOT_DOMAIN`                                                   | e.g. `aliamzdigital.com` → enables `<slug>.aliamzdigital.com`                                           |
| `NEXT_PUBLIC_SITE_URL`                                                      | e.g. `https://aliamzdigital.com` (canonicals, sitemap)                                                  |
| `CRON_SECRET`                                                               | long random string — **required**: both cron jobs 401 without it; Vercel Cron attaches it automatically |
| `DEV_BUSINESS_SLUG`                                                         | **UNSET.** Unset ⇒ apex serves the marketing landing page; set ⇒ apex serves that tenant                |
| `NODE_ENV`                                                                  | do **not** set — Vercel manages it                                                                      |
| `IMPERSONATION_SECRET`                                                      | optional (falls back to service key)                                                                    |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID` | real SMS; without them sends are logged no-ops                                                          |
| `SMS_DEFAULT_COUNTRY_CODE`                                                  | e.g. `63` — normalizes national numbers to E.164                                                        |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`                                     | AI SMS variations; template fallback without                                                            |
| `ERROR_WEBHOOK_URL`                                                         | optional error forwarding (Slack webhook etc.)                                                          |
| `VERCEL_API_TOKEN` / `VERCEL_PROJECT_ID` / `EDGE_CONFIG` / `EDGE_CONFIG_ID` | only when enabling **custom domains** (see §6)                                                          |
| `RETENTION_*_DAYS`                                                          | optional; defaults 90/90/730                                                                            |

Deploy. `vercel.json` registers the two cron jobs automatically:
review-automation every 15 min, retention nightly 03:20.

## 4. DNS (Cloudflare)

> **Cloudflare-registered domains and wildcards:** Vercel issues a *wildcard*
> certificate (`*.yourdomain.com`) only when the domain uses **Vercel's
> nameservers** — and a domain registered at Cloudflare must keep Cloudflare's
> nameservers. So the one-record wildcard shortcut is unavailable; **tenant
> subdomains are added individually** instead (a DNS record + a Vercel domain
> entry per tenant — 30 seconds each, automatable later via the same Vercel
> Domains API the custom-domain flow already uses).

In **Vercel → Project → Domains** add `aliamzdigital.com` and
`www.aliamzdigital.com`. Vercel shows the exact record values to create; in
Cloudflare DNS they are typically:

| Record | Host | Value | Proxy |
| --- | --- | --- | --- |
| CNAME | `@` (apex — Cloudflare flattens it) | `cname.vercel-dns.com` | **DNS-only (gray cloud)** |
| CNAME | `www` | `cname.vercel-dns.com` | DNS-only |

DNS-only is the simplest correct setup with Vercel (Vercel then terminates TLS
and issues certificates itself).

**Per tenant subdomain** (repeat when onboarding a client):

1. Vercel → Domains → add `roniesbarber.aliamzdigital.com`.
2. Cloudflare DNS → CNAME `roniesbarber` → `cname.vercel-dns.com`, DNS-only.

The app needs no change — `NEXT_PUBLIC_ROOT_DOMAIN` already routes any
`<slug>.aliamzdigital.com` request to that tenant; these two steps just make
the name resolve and get a certificate.

## 5. Bootstrap production

From your machine, pointing at production (env vars beat `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<prod service key> \
npm run seed -- --admin-email you@aliamzdigital.com
```

Then verify, in order:

| Check                                                  | Expect                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `https://aliamzdigital.com/`                           | Marketing landing page (not a barber site)                                           |
| `/login` → sign in → `/platform`                       | Portal loads (you're super_admin)                                                    |
| `/platform/health`                                     | Scheduler/capability tiles; after ≤15 min, "Last processor run" shows a time         |
| `/s/anything-unknown`                                  | 404                                                                                  |
| `curl -I https://aliamzdigital.com/api/jobs/retention` | **401** (secret enforced)                                                            |
| Security headers                                       | `curl -sI https://aliamzdigital.com/ \| grep -i content-security` → no `unsafe-eval` |

Finally: **replace the placeholder contact details** in
[components/marketing/landing.tsx](../components/marketing/landing.tsx)
(`CONTACT` constant — marked `TODO(aliamz)`) before announcing the site.

## 6. Onboard the first client

1. `/platform/businesses/new` → name, owner email, slug (`roniesbarber`),
   template + theme. The owner gets the invite (SMTP from §2), sets a
   password, completes onboarding, edits content in `/admin/website`.
2. Add the tenant subdomain (§4): `roniesbarber.aliamzdigital.com` in Vercel →
   Domains, plus the matching DNS-only CNAME in Cloudflare. The site is then
   live at that subdomain (and immediately at `/s/roniesbarber` regardless).

**Custom domain later (optional, per client):**

1. Set the four provisioning vars from §3 (`VERCEL_API_TOKEN`,
   `VERCEL_PROJECT_ID`, `EDGE_CONFIG`, `EDGE_CONFIG_ID`) and redeploy.
2. Client (or you) adds `roniesbarber.com` in `/admin/domains` → the page
   shows the exact DNS records to create at their registrar.
3. Once DNS propagates, "Verify" flips it live with an HTTPS cert; "Primary"
   makes it canonical (other hostnames 301 to it). Until then the subdomain
   keeps serving — nothing breaks while waiting.

## 7. Updating production

Push to `main` → CI must pass → Vercel deploys. Schema changes ship as **new
numbered migrations applied before/with the deploy** (forward-only policy —
rationale and recovery paths in [operations.md](operations.md)). Bad app
deploy with no schema change → instant rollback in the Vercel dashboard.

---

## Troubleshooting

| Symptom                                    | Cause / fix                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `/platform` redirects to `/admin`          | Signed-in user has no `platform_admins` row — run the seed with that email                                   |
| Owner invite never arrives                 | SMTP not configured in Supabase (§2.3)                                                                       |
| Cron never runs / queue grows              | `CRON_SECRET` unset, or crons disabled — check `/platform/health`                                            |
| `claim_due_review_messages` errors         | Migration `0017` not applied                                                                                 |
| Apex shows a tenant site in prod           | `DEV_BUSINESS_SLUG` is set in Vercel env — remove it and redeploy                                            |
| `NEXT_PUBLIC_*` change has no effect       | Build-time inlining — redeploy after changing                                                                |
| `eval()` CSP error in dev console          | Fixed via phase-based CSP; also remove any global `NODE_ENV` from your machine                               |
| CMS image from an odd host isn't optimized | By design — unknown hosts render as plain `<img>`; allow-list is `lib/images/safe-src.ts` + `next.config.ts` |
