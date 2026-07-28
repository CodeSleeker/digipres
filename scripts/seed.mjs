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

const ADMIN_EMAIL = args["admin-email"] ?? process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD =
  args["admin-password"] ?? process.env.SEED_ADMIN_PASSWORD ?? null;
const DEMO = Boolean(args["demo"]);
const DEMO_SLUG = args["demo-slug"] ?? "ronies";
const DEMO_OWNER_EMAIL =
  args["demo-owner-email"] ?? `owner+${DEMO_SLUG}@seed.local`;
const DRY_RUN = Boolean(args["dry-run"]);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
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

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function generatedPassword() {
  // 18 bytes → 24 chars base64url; well past any GoTrue policy.
  return randomBytes(18).toString("base64url");
}

async function api(path, init = {}) {
  const res = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
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
  const admin = await ensureUser(ADMIN_EMAIL, adminPassword);
  await upsertPlatformAdmin(admin.id);
  console.log(
    `\n✔ ${ADMIN_EMAIL} is super_admin (user ${admin.id}, ${admin.created ? "created" : "already existed"})`,
  );
  if (admin.created && !ADMIN_PASSWORD) {
    console.log(
      `  Generated password (shown once — store it now): ${adminPassword}`,
    );
  }
  if (!admin.created) {
    console.log("  Existing user: password unchanged.");
  }

  // 3. Demo tenant.
  if (DEMO) {
    const existing = await findBusinessBySlug(DEMO_SLUG);
    if (existing) {
      console.log(`✔ business "${DEMO_SLUG}" already exists — left untouched`);
    } else {
      const ownerPassword = generatedPassword();
      const owner = await ensureUser(DEMO_OWNER_EMAIL, ownerPassword);
      const business = await createBusiness(owner.id, DEMO_SLUG);
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
