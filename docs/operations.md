# Operations

## Bootstrap / seeding

Fresh environment (local or a new Supabase project), after applying the
migrations in `supabase/migrations/` in order:

```bash
# Super admin only — password generated and printed once:
npm run seed -- --admin-email you@example.com

# Also create the demo tenant (slug "ronies", renders at "/" in dev):
npm run seed -- --admin-email you@example.com --demo

# Preview without making any changes:
npm run seed -- --admin-email you@example.com --demo --dry-run
```

The script reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from
`.env.local` (real environment variables take precedence). It is **idempotent**:
an existing user keeps their password, an existing business is left untouched,
and the `platform_admins` upsert is a no-op when the role is already granted.
Flags: `--admin-password`, `--demo-slug`, `--demo-owner-email`.

This replaces the manual flow (dashboard user + hand-written SQL insert with a
copy-pasted UUID) — the UUID mismatch that flow invites is the failure the
script exists to prevent.

## Migrations: forward-only, with compensating rollbacks

Migrations `0001`–`0018` are **forward-only by policy**. There are no `down`
scripts, deliberately:

- Down migrations that drop columns/tables **destroy tenant data** — running
  one in production is almost never what an operator wants under pressure.
- Untested reversals are riskier than the failures they claim to fix; testing
  18 of them meaningfully would cost more than the value they add.

What to do instead:

1. **Bad schema change shipped?** Write a new, numbered **compensating
   migration** that moves the schema forward to the corrected state (e.g.
   `0017` reshaped the claim function `0008` introduced — that is the model).
   CI applies every migration to a disposable Postgres, so the corrected chain
   is proven end-to-end before deploy.
2. **Data damaged?** Restore from Supabase **point-in-time recovery** (Pro
   plan) or the daily backup — recovery of data is a backup concern, not a
   migration concern.
3. **Bad app deploy (no schema change)?** Roll back the deployment in Vercel
   (instant); migrations are additive, so the previous app version keeps
   working against the newer schema.

Rules that make this safe, already in practice in `supabase/migrations/`:
additive changes with defaults (`add column … not null default …`), no renames
(add-new + backfill + switch reads instead), `drop function` guarded by
`if exists` before recreation, and enum growth via new columns when a value
can't be added transactionally (`0008`).

## Scheduled jobs

| Job               | Route                         | Schedule (vercel.json) | Guard                                |
| ----------------- | ----------------------------- | ---------------------- | ------------------------------------ |
| Review automation | `/api/jobs/review-automation` | every 15 min           | `Authorization: Bearer $CRON_SECRET` |
| Retention purge   | `/api/jobs/retention`         | nightly 03:20          | same                                 |

Both fail **closed** when `CRON_SECRET` is unset (401). Their last runs are
visible at `/platform/health`; retention windows come from
`RETENTION_MESSAGE_DAYS` / `RETENTION_JOB_RUN_DAYS` / `RETENTION_AUDIT_DAYS`
(defaults 90/90/730 — invalid values fall back rather than shorten).
