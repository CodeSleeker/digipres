# Digital Presence Platform (Aliamz Digital)

Multi-tenant SaaS for local businesses: professional websites on industry
templates, review automation (SMS), customer CRM, appointments, analytics, and
SEO/AI visibility — one shared platform, one dashboard per business.

| Surface                | URL                                                     | Who             |
| ---------------------- | ------------------------------------------------------- | --------------- |
| Marketing landing page | `/` (production apex)                                   | Public          |
| Tenant websites        | `<slug>.yourdomain.com`, custom domains, or `/s/<slug>` | Public          |
| Business back office   | `/admin`                                                | Business owners |
| Super admin portal     | `/platform`                                             | Platform staff  |

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase
(Postgres + Auth, Row Level Security) · Vercel.

---

## Local development — from zero

### 1. Prerequisites

- **Node 22+** (`package.json` engines; supabase-js requires it)
- A [Supabase](https://supabase.com) project (free tier works)

> ⚠️ If your machine exports a global `NODE_ENV` (e.g. `staging`), remove it —
> it breaks Node tooling assumptions. The app defends against it, but don't
> rely on that.

### 2. Install & configure

```bash
npm install
cp .env.example .env.local
```

Fill the minimum in `.env.local` (Supabase dashboard → Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server-only; never expose
DEV_BUSINESS_SLUG=ronies                        # tenant previewed at "/"
NEXT_PUBLIC_ROOT_DOMAIN=                        # leave BLANK locally
```

Everything else in [.env.example](.env.example) is optional locally — SMS falls
back to a logging stub, AI generation to templates, custom domains simply
aren't exercised.

### 3. Database

Apply every migration in [supabase/migrations/](supabase/migrations/) **in
order** (`0001` → `0018`): paste each into the Supabase SQL Editor, or
`supabase db push` with the CLI.

### 4. Bootstrap accounts (one command)

```bash
# Super admin (password generated & printed once) + demo "ronies" tenant:
npm run seed -- --admin-email you@example.com --demo
```

Idempotent; details in [docs/operations.md](docs/operations.md).

### 5. Run

```bash
npm run dev
```

| URL                      | What you get                                           |
| ------------------------ | ------------------------------------------------------ |
| `http://localhost:3000/` | The `DEV_BUSINESS_SLUG` tenant's website (dev preview) |
| `/s/ronies`              | Any tenant by slug                                     |
| `/login` → `/admin`      | Owner back office                                      |
| `/platform`              | Super admin portal (seeded account)                    |

The apex `/` renders the **marketing landing page** instead of the tenant
preview when `DEV_BUSINESS_SLUG` is unset — that's the production behavior.
Note the mode is decided **at build/dev-server start**, not per request.

## Everyday commands

```bash
npm run dev          # dev server
npm test             # unit/integration tests (fast, no DB needed)
npm run lint         # eslint
npx tsc --noEmit     # type-check
npm run build        # production build
npm start            # serve the production build
npm run smoke        # 9 route checks against a running server
npm run seed         # bootstrap accounts (see docs/operations.md)
```

**DB-level RLS tests** (the tenant-isolation proof) run when `DATABASE_URL`
points at a **disposable** Postgres:

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/throwaway npm test
```

CI runs the full chain — types, lint, all tests against a Postgres service
container, build, smoke — on every push.

## Onboarding a client (e.g. Ronie)

1. Sign in as super admin → **`/platform/businesses/new`**.
2. Business name, owner email, slug (e.g. `roniesbarber`), template
   (`Barber — Luxury`) + theme.
3. The owner receives an **invite email** (requires Supabase SMTP — see
   deployment doc), sets their own password, and lands in `/admin` to finish
   onboarding and edit content in `/admin/website`.
4. Site is live immediately at `/s/<slug>` (and `<slug>.<root-domain>` in
   production). Custom domains come later via `/admin/domains` — never required
   for launch.

No self-signup exists by design: clients are onboarded by you.

## Project layout

```
app/            routes (public site, /admin, /platform, API/jobs)
components/     shared UI (incl. marketing landing, TenantImage)
features/       feature modules: actions + UI (appointments, reviews, CMS…)
services/       business rules (all tenant services are business-scoped)
repositories/   data access (every query filtered by business_id)
lib/            tenant resolution, auth, security, jobs, images
templates/      industry website templates (html mockups + React ports)
supabase/       migrations 0001–0018 (forward-only; see docs/operations.md)
tests/          229 tests incl. DB-level RLS isolation
```

## Documentation

- [docs/deployment.md](docs/deployment.md) — **production deployment, step by step**
- [docs/operations.md](docs/operations.md) — seeding, migration/rollback policy, cron jobs
- [docs/architecture/multi-tenancy.md](docs/architecture/multi-tenancy.md) — tenancy model, RLS, routing, impersonation
- [docs/production-readiness-review-8.md](docs/production-readiness-review-8.md) — latest audit (94/100) + launch checklist
