import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * DB-LEVEL RLS isolation tests — proves Postgres denies cross-tenant access, the
 * platform's core guarantee. Runs only when DATABASE_URL points at a disposable
 * Postgres (CI service container, or a local throwaway cluster); skipped in the
 * default `npm test` run.
 *
 * It reconstructs the minimal Supabase surface the migrations depend on
 * (auth.users, auth.uid(), the authenticated/anon roles AND Supabase's default
 * table privileges), applies every migration, seeds two tenants, then queries as
 * each role to assert isolation.
 *
 * The default-privileges ordering matters: Supabase grants privileges to new
 * tables at creation time, which is what lets a migration's own REVOKE/GRANT
 * narrow them (0010 does exactly that so owners cannot write `verified`).
 */
const DATABASE_URL = process.env.DATABASE_URL;

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, "..", "..", "supabase", "migrations");

const BOOTSTRAP = `
  drop schema if exists public cascade;
  create schema public;
  drop schema if exists auth cascade;
  create schema auth;

  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  do $$ begin
    if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  end $$;

  grant usage on schema public, auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;

  -- Supabase-equivalent default privileges, applied BEFORE the migrations run so
  -- tables are granted at creation and migration-level REVOKEs actually bite.
  alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;
  alter default privileges in schema public
    grant select on tables to anon;
`;

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe.skipIf(!DATABASE_URL)("DB-level RLS tenant isolation", () => {
  const client = new Client({ connectionString: DATABASE_URL });
  const ownerA = "11111111-1111-1111-1111-111111111111";
  const ownerB = "22222222-2222-2222-2222-222222222222";
  let bizA = "";
  let bizB = "";
  let aPendingDomainId = "";

  beforeAll(async () => {
    await client.connect();
    await client.query(BOOTSTRAP);
    for (const file of migrationFiles()) {
      await client.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    }

    // Seed as superuser (bypasses RLS).
    await client.query(
      `insert into auth.users (id, email) values ($1,'a@test.dev'), ($2,'b@test.dev')`,
      [ownerA, ownerB],
    );
    const a = await client.query(
      `insert into public.businesses (owner_id, name, slug) values ($1,'A Co','a-co') returning id`,
      [ownerA],
    );
    const b = await client.query(
      `insert into public.businesses (owner_id, name, slug) values ($1,'B Co','b-co') returning id`,
      [ownerB],
    );
    bizA = a.rows[0].id;
    bizB = b.rows[0].id;

    await client.query(
      `insert into public.customers (business_id, name) values ($1,'A-Cust-1'), ($1,'A-Cust-2'), ($2,'B-Cust-1')`,
      [bizA, bizB],
    );

    const domains = await client.query(
      `insert into public.business_domains (business_id, hostname, verified, is_primary)
       values ($1,'a-primary.test',true,true), ($1,'a-pending.test',false,false)
       returning id, hostname`,
      [bizA],
    );
    aPendingDomainId = domains.rows.find(
      (r: { hostname: string }) => r.hostname === "a-pending.test",
    ).id;
    await client.query(
      `insert into public.business_domains (business_id, hostname, verified, is_primary)
       values ($1,'b-primary.test',true,true), ($1,'b-pending.test',false,false)`,
      [bizB],
    );
  }, 60_000);

  afterAll(async () => {
    await client.end();
  });

  async function asOwner(sub: string) {
    await client.query("reset role");
    await client.query(
      "select set_config('request.jwt.claim.sub', $1, false)",
      [sub],
    );
    await client.query("set role authenticated");
  }

  async function asAnon() {
    await client.query("reset role");
    await client.query("select set_config('request.jwt.claim.sub', '', false)");
    await client.query("set role anon");
  }

  /* --- Customers -------------------------------------------------------- */

  it("an owner sees only their own customers", async () => {
    await asOwner(ownerA);
    const mine = await client.query("select count(*)::int n from customers");
    expect(mine.rows[0].n).toBe(2);

    const others = await client.query(
      "select count(*)::int n from customers where business_id = $1",
      [bizB],
    );
    expect(others.rows[0].n).toBe(0);
  });

  it("the other owner sees only theirs", async () => {
    await asOwner(ownerB);
    const mine = await client.query("select count(*)::int n from customers");
    expect(mine.rows[0].n).toBe(1);
  });

  it("an owner cannot INSERT a customer into another tenant's business", async () => {
    await asOwner(ownerA);
    await expect(
      client.query(
        "insert into public.customers (business_id, name) values ($1,'hijack')",
        [bizB],
      ),
    ).rejects.toThrow();
  });

  it("owns_business() is true only for the caller's business", async () => {
    await asOwner(ownerA);
    const own = await client.query("select public.owns_business($1) v", [bizA]);
    const other = await client.query("select public.owns_business($1) v", [
      bizB,
    ]);
    expect(own.rows[0].v).toBe(true);
    expect(other.rows[0].v).toBe(false);
  });

  /* --- Custom domains --------------------------------------------------- */

  it("another tenant's UNVERIFIED domains stay private", async () => {
    await asOwner(ownerA);

    const mine = await client.query(
      "select count(*)::int n from business_domains where business_id = $1",
      [bizA],
    );
    expect(mine.rows[0].n).toBe(2); // a-primary + a-pending

    // B's pending hostname is invisible to A — that's the private boundary.
    const hidden = await client.query(
      "select count(*)::int n from business_domains where hostname = 'b-pending.test'",
    );
    expect(hidden.rows[0].n).toBe(0);
  });

  it("a VERIFIED hostname is public routing info by design", async () => {
    await asOwner(ownerA);
    // Intentional: a verified hostname is a live public website address, and the
    // edge/sitemap must resolve it. Nothing private is implied by seeing it.
    const seen = await client.query(
      "select count(*)::int n from business_domains where hostname = 'b-primary.test'",
    );
    expect(seen.rows[0].n).toBe(1);
  });

  it("an owner cannot modify another tenant's domain", async () => {
    await asOwner(ownerA);
    const res = await client.query(
      "update public.business_domains set is_primary = false where business_id = $1",
      [bizB],
    );
    expect(res.rowCount).toBe(0); // RLS filters the rows out entirely
  });

  it("an owner CANNOT mark their own domain verified (anti-hijack)", async () => {
    await asOwner(ownerA);
    // `verified` is revoked at the column level — only service-role may set it.
    await expect(
      client.query(
        "update public.business_domains set verified = true where id = $1",
        [aPendingDomainId],
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("an owner CAN still change is_primary (the one writable column)", async () => {
    await asOwner(ownerA);
    await expect(
      client.query(
        "update public.business_domains set is_primary = false where id = $1",
        [aPendingDomainId],
      ),
    ).resolves.toBeDefined();
  });

  it("an owner cannot add a pre-verified domain, or one for another tenant", async () => {
    await asOwner(ownerA);
    await expect(
      client.query(
        `insert into public.business_domains (business_id, hostname, verified)
         values ($1,'sneaky.test',true)`,
        [bizA],
      ),
    ).rejects.toThrow(); // RLS WITH CHECK requires verified = false

    await expect(
      client.query(
        `insert into public.business_domains (business_id, hostname) values ($1,'steal.test')`,
        [bizB],
      ),
    ).rejects.toThrow(); // not their business
  });

  it("the public (anon) role sees verified domains only", async () => {
    await asAnon();
    const all = await client.query(
      "select count(*)::int n from business_domains",
    );
    expect(all.rows[0].n).toBe(2); // a-primary + b-primary, never a-pending

    const pending = await client.query(
      `select count(*)::int n from business_domains
       where hostname in ('a-pending.test','b-pending.test')`,
    );
    expect(pending.rows[0].n).toBe(0);
  });

  /* --- Platform roles (migration 0011) ---------------------------------- */

  it("a tenant owner is NOT platform staff", async () => {
    await asOwner(ownerA);
    const res = await client.query("select public.is_platform_admin() v");
    expect(res.rows[0].v).toBe(false);

    const role = await client.query("select public.current_platform_role() v");
    expect(role.rows[0].v).toBeNull();
  });

  it("a tenant owner cannot see the platform roster", async () => {
    // Seed a real platform admin as superuser.
    await client.query("reset role");
    await client.query(
      `insert into public.platform_admins (user_id, role) values ($1,'super_admin')
       on conflict (user_id) do nothing`,
      [ownerB],
    );

    await asOwner(ownerA);
    const res = await client.query(
      "select count(*)::int n from platform_admins",
    );
    expect(res.rows[0].n).toBe(0); // can only ever see their own row — they have none
  });

  it("a tenant owner CANNOT grant themselves platform access", async () => {
    await asOwner(ownerA);
    // The privilege-escalation boundary: only a super_admin may insert.
    await expect(
      client.query(
        `insert into public.platform_admins (user_id, role) values ($1,'super_admin')`,
        [ownerA],
      ),
    ).rejects.toThrow();
  });

  it("platform staff can read the roster and the audit log", async () => {
    await asOwner(ownerB); // ownerB was made super_admin above
    const roster = await client.query(
      "select count(*)::int n from platform_admins",
    );
    expect(roster.rows[0].n).toBe(1);
    expect(
      (await client.query("select public.is_platform_admin() v")).rows[0].v,
    ).toBe(true);

    await client.query(
      `insert into public.audit_log (actor_user_id, action) values ($1,'test.action')`,
      [ownerB],
    );
    const log = await client.query("select count(*)::int n from audit_log");
    expect(log.rows[0].n).toBe(1);
  });

  it("a tenant owner cannot read or write the audit log", async () => {
    await asOwner(ownerA);
    const read = await client.query("select count(*)::int n from audit_log");
    expect(read.rows[0].n).toBe(0);

    await expect(
      client.query(
        `insert into public.audit_log (actor_user_id, action) values ($1,'sneaky')`,
        [ownerA],
      ),
    ).rejects.toThrow();
  });

  it("platform staff can READ across tenants (migration 0012)", async () => {
    await asOwner(ownerB); // super_admin
    const customers = await client.query(
      "select count(*)::int n from customers",
    );
    expect(customers.rows[0].n).toBe(3); // A's 2 + B's 1 — the whole platform

    const domains = await client.query(
      "select count(*)::int n from business_domains",
    );
    expect(domains.rows[0].n).toBe(4); // incl. both tenants' UNVERIFIED rows
  });

  it("platform staff still CANNOT write another tenant's data", async () => {
    await asOwner(ownerB); // super_admin, but bizA is not theirs
    const res = await client.query(
      "update public.customers set name = 'tampered' where business_id = $1",
      [bizA],
    );
    expect(res.rowCount).toBe(0); // read-only: no platform write policy exists

    await expect(
      client.query(
        "insert into public.customers (business_id, name) values ($1,'ghost')",
        [bizA],
      ),
    ).rejects.toThrow();
  });

  it("a normal owner's reads are unchanged by the platform policies", async () => {
    await asOwner(ownerA); // not staff
    const customers = await client.query(
      "select count(*)::int n from customers",
    );
    expect(customers.rows[0].n).toBe(2); // still only their own
  });

  it("the audit log is append-only, even for platform staff", async () => {
    await asOwner(ownerB); // super_admin
    const upd = await client.query(
      "update public.audit_log set action = 'tampered'",
    );
    expect(upd.rowCount).toBe(0); // no UPDATE policy exists

    const del = await client.query("delete from public.audit_log");
    expect(del.rowCount).toBe(0); // no DELETE policy exists
  });

  /* --- Scoped message claiming (migration 0017) ------------------------- */

  it("a scoped claim takes only that tenant's due messages", async () => {
    // As the service role (RLS bypassed), exactly as impersonation runs.
    await client.query("reset role");
    await client.query(
      `insert into public.customers (business_id, name, mobile)
       values ($1,'A-Sms','+15550001'), ($2,'B-Sms','+15550002')`,
      [bizA, bizB],
    );
    await client.query(
      `insert into public.review_messages
         (business_id, customer_id, step, to_mobile, customer_name, body, status, scheduled_at)
       select c.business_id, c.id, 'thank_you', c.mobile, c.name, 'hi', 'queued', now() - interval '1 minute'
       from public.customers c where c.name in ('A-Sms','B-Sms')`,
    );

    const claimed = await client.query(
      `select business_id from public.claim_due_review_messages(100, now(), $1)`,
      [bizA],
    );

    // The whole point: B's message is NOT claimed, so it is never sent.
    expect(claimed.rowCount).toBe(1);
    expect(claimed.rows[0].business_id).toBe(bizA);

    const bStillQueued = await client.query(
      `select count(*)::int n from public.review_messages
       where business_id = $1 and status = 'queued' and claimed_at is null`,
      [bizB],
    );
    expect(bStillQueued.rows[0].n).toBe(1);
  });

  it("an unscoped claim still serves every tenant (the scheduler)", async () => {
    await client.query("reset role");
    const claimed = await client.query(
      `select business_id from public.claim_due_review_messages(100, now(), null)`,
    );
    // A's row is already claimed; B's is picked up here.
    expect(
      claimed.rows.map((r: { business_id: string }) => r.business_id),
    ).toContain(bizB);
  });

  it("an owner cannot claim another tenant's messages even unscoped", async () => {
    // SECURITY INVOKER: RLS still applies to a real owner session.
    await client.query(
      `update public.review_messages set status='queued', claimed_at=null`,
    );
    await asOwner(ownerA);
    const claimed = await client.query(
      `select business_id from public.claim_due_review_messages(100, now(), null)`,
    );
    expect(
      claimed.rows.every(
        (r: { business_id: string }) => r.business_id === bizA,
      ),
    ).toBe(true);
  });

  /* --- Retention purge (migration 0018) --------------------------------- */

  it("purges only rows past their window, and never a queued message", async () => {
    await client.query("reset role");
    // One old terminal message, one old QUEUED message, one recent terminal.
    await client.query(
      `insert into public.review_messages
         (business_id, customer_id, step, to_mobile, customer_name, body, status, scheduled_at, created_at)
       select $1, c.id, 'thank_you', '+15550003', c.name, 'x', s.status::review_message_status,
              now(), s.created
       from public.customers c,
            (values ('sent', now() - interval '200 days'),
                    ('queued', now() - interval '200 days'),
                    ('sent', now() - interval '3 days')) as s(status, created)
       where c.name = 'A-Cust-1'`,
      [bizA],
    );
    await client.query(
      `insert into public.job_runs (job, status, started_at)
       values ('retention','success', now() - interval '200 days'),
              ('retention','success', now() - interval '1 day')`,
    );
    await client.query(
      `insert into public.audit_log (actor_user_id, action, created_at)
       values ($1,'old.action', now() - interval '800 days'),
              ($1,'new.action', now() - interval '10 days')`,
      [ownerA],
    );

    const purged = await client.query(
      `select * from public.purge_expired_rows(90, 90, 730)`,
    );
    const row = purged.rows[0];
    expect(row.messages_deleted).toBe(1); // the old SENT one only
    expect(row.job_runs_deleted).toBe(1);
    expect(row.audit_deleted).toBe(1);

    // The 200-day-old QUEUED message survives: it is still owed to a customer.
    const survivors = await client.query(
      `select status from public.review_messages
       where business_id = $1 and to_mobile = '+15550003'
       order by created_at`,
      [bizA],
    );
    expect(
      survivors.rows.map((r: { status: string }) => r.status).sort(),
    ).toEqual(["queued", "sent"]);
  });

  it("refuses a window that would wipe live data", async () => {
    await client.query("reset role");
    await expect(
      client.query(`select * from public.purge_expired_rows(0, 90, 730)`),
    ).rejects.toThrow(/must be >= 1 day/);
  });

  it("a tenant owner cannot trigger a purge", async () => {
    await asOwner(ownerA);
    await expect(
      client.query(`select * from public.purge_expired_rows(90, 90, 730)`),
    ).rejects.toThrow(/permission denied/i);
  });

  it("platform staff cannot purge either — no shredding your own trail", async () => {
    await asOwner(ownerB); // made super_admin earlier in this file
    await expect(
      client.query(`select * from public.purge_expired_rows(1, 1, 1)`),
    ).rejects.toThrow(/permission denied/i);
  });

  it("a hostname cannot be claimed by two businesses", async () => {
    await client.query("reset role"); // superuser: isolate the constraint from RLS
    await expect(
      client.query(
        `insert into public.business_domains (business_id, hostname) values ($1,'a-primary.test')`,
        [bizB],
      ),
    ).rejects.toThrow(/duplicate key/i);
  });
});
