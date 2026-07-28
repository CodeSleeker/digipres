import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./env-file.mjs";

/**
 * Bootstrap seeder — replaces the error-prone manual flow (dashboard user
 * creation + hand-written SQL with a copy-pasted UUID).
 *
 *   npm run seed -- --admin-email you@example.com
 *   npm run seed -- --admin-email you@example.com --demo
 *   npm run seed -- --dry-run --admin-email you@example.com
 *
 * What it does (idempotent — safe to re-run):
 *   1. Ensures an auth user for --admin-email (password from
 *      --admin-password / SEED_ADMIN_PASSWORD, or a generated one printed ONCE).
 *   2. Upserts that user into public.platform_admins as super_admin.
 *   3. With --demo: ensures a demo owner + a "Ronie's Barber" business
 *      (slug "ronies") so DEV_BUSINESS_SLUG=ronies renders at "/".
 *
 * Talks to GoTrue admin + PostgREST over plain fetch with the service-role key
 * (no SDK — supabase-js realtime is unhappy on older Node). NEVER commit or
 * share the service-role key; this script is for operators only.
 */

loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));

const args = parseArgs(process.argv.slice(2));
const URL_BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Falls back to the first bare email argument, so npm dropping the flag name
// (see parseArgs) doesn't break the command.
const ADMIN_EMAIL =
  args["admin-email"] ??
  process.env.SEED_ADMIN_EMAIL ??
  args._.find(looksLikeEmail);
const ADMIN_PASSWORD =
  args["admin-password"] ?? process.env.SEED_ADMIN_PASSWORD ?? null;
const DEMO = Boolean(args["demo"]);
const DEMO_SLUG = args["demo-slug"] ?? "ronies";
const DEMO_OWNER_EMAIL =
  args["demo-owner-email"] ?? `owner+${DEMO_SLUG}@seed.local`;
const DRY_RUN = Boolean(args["dry-run"]);

/**
 * Supports `--key value`, `--key=value`, bare `--flag`, and POSITIONAL values.
 *
 * The positional support matters: `npm run seed -- --admin-email you@x.com`
 * can reach the script as just `you@x.com` — npm consumes the flag itself and
 * forwards only the value. Accepting a bare email means every spelling works.
 */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }

    const equals = arg.indexOf("=");
    if (equals !== -1) {
      out[arg.slice(2, equals)] = arg.slice(equals + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

// A function DECLARATION, not a const arrow: this is called by the top-level
// ADMIN_EMAIL constant above, so it has to be hoisted.
function looksLikeEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function generatedPassword() {
  // 18 bytes → 24 chars base64url; well past any GoTrue policy.
  return randomBytes(18).toString("base64url");
}

/** Seconds before a stalled request gives up rather than hanging forever. */
const REQUEST_TIMEOUT_MS = 20_000;

function step(message) {
  process.stdout.write(`  → ${message}… `);
}
function done(message = "ok") {
  process.stdout.write(`${message}\n`);
}

async function api(path, init = {}) {
  let res;
  try {
    res = await fetch(`${URL_BASE}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    process.stdout.write("failed\n");
    fail(
      timedOut
        ? `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s calling ${path}. ` +
            `Check network access to ${URL_BASE} (VPN, firewall or proxy?).`
        : `Could not reach ${URL_BASE}${path}: ${error?.message ?? error}. ` +
            `Check NEXT_PUBLIC_SUPABASE_URL and your connection.`,
    );
  }

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  // A wrong/blank service key is the most common setup mistake — name it.
  if (res.status === 401 || res.status === 403) {
    process.stdout.write("failed\n");
    fail(
      `${res.status} from ${path} — SUPABASE_SERVICE_ROLE_KEY looks wrong. ` +
        `Use the SERVICE ROLE key (Settings → API), not the anon key.`,
    );
  }

  return { status: res.status, ok: res.ok, body };
}

/** Create the auth user, or resolve their id if they already exist. */
async function ensureUser(email, password) {
  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (created.ok && created.body?.id) {
    return { id: created.body.id, created: true };
  }

  // Already registered → generate_link returns the user WITHOUT sending mail.
  const link = await api("/auth/v1/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const id = link.body?.user?.id ?? link.body?.id;
  if (id) return { id, created: false };

  fail(
    `Could not create or resolve user ${email}: ` +
      `${created.status} ${JSON.stringify(created.body)}`,
  );
}

async function upsertPlatformAdmin(userId) {
  const res = await api("/rest/v1/platform_admins", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, role: "super_admin" }),
  });
  if (!res.ok) {
    fail(
      `platform_admins upsert failed (${res.status}): ${JSON.stringify(res.body)}. ` +
        `Are migrations 0011+ applied?`,
    );
  }
}

async function findBusinessBySlug(slug) {
  const res = await api(
    `/rest/v1/businesses?slug=eq.${encodeURIComponent(slug)}&deleted_at=is.null&select=id,name,slug,owner_id`,
  );
  if (!res.ok) fail(`businesses read failed (${res.status})`);
  return res.body?.[0] ?? null;
}

async function createBusiness(ownerId, slug) {
  const res = await api("/rest/v1/businesses", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: ownerId,
      name: "Ronie's Barber",
      slug,
      category: "barber",
      status: "active",
      description: "Premium men's grooming — seeded demo business.",
    }),
  });
  if (!res.ok) {
    fail(`business insert failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body?.[0];
}

async function main() {
  if (!ADMIN_EMAIL) {
    fail(
      "Missing --admin-email (or SEED_ADMIN_EMAIL). " +
        "Usage: npm run seed -- --admin-email you@example.com [--demo] [--dry-run]",
    );
  }
  if (!URL_BASE || !SERVICE_KEY) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required " +
        "(from .env.local or the environment).",
    );
  }

  const host = new URL(URL_BASE).host;
  console.log(`Seeding against: ${host}`);
  console.log(`  super admin:   ${ADMIN_EMAIL}`);
  if (DEMO)
    console.log(`  demo business: "${DEMO_SLUG}" owned by ${DEMO_OWNER_EMAIL}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: no changes made. Planned actions:");
    console.log("  1. ensure auth user (email confirmed) for the admin email");
    console.log("  2. upsert public.platform_admins role=super_admin");
    if (DEMO) {
      console.log(
        `  3. ensure demo owner + active business slug "${DEMO_SLUG}"`,
      );
    }
    return;
  }

  // 1–2. Super admin.
  const adminPassword = ADMIN_PASSWORD ?? generatedPassword();
  step("ensuring the auth user exists");
  const admin = await ensureUser(ADMIN_EMAIL, adminPassword);
  done(admin.created ? "created" : "already existed");

  step("granting super_admin");
  await upsertPlatformAdmin(admin.id);
  done();

  console.log(`\n✔ ${ADMIN_EMAIL} is super_admin (user ${admin.id})`);
  if (admin.created && !ADMIN_PASSWORD) {
    console.log(
      `  Generated password (shown once — store it now): ${adminPassword}`,
    );
  }
  if (!admin.created) {
    console.log("  Existing user — password unchanged.");
  }

  // 3. Demo tenant.
  if (DEMO) {
    step(`checking for business "${DEMO_SLUG}"`);
    const existing = await findBusinessBySlug(DEMO_SLUG);
    done(existing ? "exists" : "not found");
    if (existing) {
      console.log(`✔ business "${DEMO_SLUG}" already exists — left untouched`);
    } else {
      const ownerPassword = generatedPassword();
      step("creating the demo owner");
      const owner = await ensureUser(DEMO_OWNER_EMAIL, ownerPassword);
      done(owner.created ? "created" : "already existed");
      step("creating the business");
      const business = await createBusiness(owner.id, DEMO_SLUG);
      done();
      console.log(`✔ created business "${business.slug}" (${business.id})`);
      console.log(`  owner: ${DEMO_OWNER_EMAIL}`);
      if (owner.created) {
        console.log(`  owner password (shown once): ${ownerPassword}`);
      }
    }
  }

  console.log(
    "\nDone. Log in at /login, the portal is at /platform" +
      (DEMO ? `, the demo site at /s/${DEMO_SLUG}.` : "."),
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
