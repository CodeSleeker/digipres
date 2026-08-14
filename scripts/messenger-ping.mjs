#!/usr/bin/env node
import { createHmac } from "node:crypto";
import { loadEnvFile } from "./env-file.mjs";

/**
 * Send a correctly signed Messenger webhook delivery to our own endpoint.
 *
 * WHY THIS EXISTS: testing through Facebook couples "does my code work" to a
 * pile of things that have nothing to do with the code — whether the Page is
 * published, whether messaging is enabled on it, whether the account you happen
 * to be logged in as is allowed to write to a Page it administers. This proves
 * the route, the signature check, the Page lookup, the dedupe and the storage
 * in one command, with no Facebook involved.
 *
 * It signs the body with META_APP_SECRET exactly as Meta does, so a successful
 * run means a real delivery would be accepted too.
 *
 * Usage:
 *   npm run messenger:ping -- --page <PAGE_ID> [options]
 *
 *   --page   <id>    Page id. Must match a messaging_channels row, or the route
 *                    will log unknown-page and store nothing.
 *   --url    <url>   Webhook URL. Defaults to NEXT_PUBLIC_SITE_URL + the path.
 *   --psid   <id>    Sender id. Defaults to a fixed test PSID, so repeat runs
 *                    land in the same conversation.
 *   --text   <text>  Message body.
 *   --mid    <id>    Message id. Defaults to a unique one; pass the SAME value
 *                    twice to prove the dedupe.
 *   --verify         Do the GET handshake instead of posting a message.
 */

loadEnvFile(".env.local");

const args = process.argv.slice(2);
function arg(name, fallback = undefined) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const has = (name) => args.includes(`--${name}`);

const base = (arg("url") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(
  /\/+$/,
  "",
);
if (!base) {
  console.error("No target. Pass --url or set NEXT_PUBLIC_SITE_URL.");
  process.exit(1);
}
const endpoint = base.includes("/api/messenger/webhook")
  ? base
  : `${base}/api/messenger/webhook`;

/* ── The GET handshake ───────────────────────────────────────────────────── */
if (has("verify")) {
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!token) {
    console.error("META_WEBHOOK_VERIFY_TOKEN is not set locally.");
    process.exit(1);
  }
  const challenge = String(Math.floor(Math.random() * 1e9));
  const url = `${endpoint}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=${challenge}`;
  const res = await fetch(url);
  const body = (await res.text()).trim();
  const ok = res.status === 200 && body === challenge;
  console.log(`GET  ${res.status}  body=${JSON.stringify(body)}`);
  console.log(
    ok
      ? "PASS — the challenge was echoed verbatim."
      : "FAIL — Meta compares the body byte for byte; it must be the challenge alone.",
  );
  process.exit(ok ? 0 : 1);
}

/* ── A signed message delivery ───────────────────────────────────────────── */
const secret = process.env.META_APP_SECRET?.trim();
if (!secret) {
  console.error(
    "META_APP_SECRET is not set locally. Add it to .env.local (the same value\n" +
      "as the deployment), or run with META_APP_SECRET=... prefixed.",
  );
  process.exit(1);
}

const pageId = arg("page");
if (!pageId) {
  console.error("Pass --page <PAGE_ID>. It must match a messaging_channels row.");
  process.exit(1);
}

const payload = {
  object: "page",
  entry: [
    {
      id: pageId,
      time: Date.now(),
      messaging: [
        {
          sender: { id: arg("psid", "TEST_PSID_1") },
          recipient: { id: pageId },
          timestamp: Date.now(),
          message: {
            mid: arg("mid", `m_test_${Date.now()}`),
            text: arg("text", "hello from messenger-ping"),
          },
        },
      ],
    },
  ],
};

// Sign the EXACT bytes that are sent. Re-serializing after signing is the
// classic way to make a valid signature fail.
const raw = JSON.stringify(payload);
const signature = `sha256=${createHmac("sha256", secret).update(raw, "utf-8").digest("hex")}`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Hub-Signature-256": signature,
  },
  body: raw,
});

console.log(`POST ${endpoint}`);
console.log(`  page=${pageId} mid=${payload.entry[0].messaging[0].message.mid}`);
console.log(`  ${res.status}  ${(await res.text()).trim()}`);

if (res.status === 200) {
  console.log(
    "\nPASS — signature accepted and the delivery was acknowledged.\n" +
      "Check the tables; if they are empty, the logs will show unknown-page,\n" +
      "meaning --page doesn't match any messaging_channels row.",
  );
} else if (res.status === 403) {
  console.log("\nFAIL — signature rejected. META_APP_SECRET differs from the deployment's.");
} else if (res.status === 503) {
  console.log("\nFAIL — META_APP_SECRET is not set on the deployment.");
} else if (res.status === 500) {
  console.log("\nFAIL — storage error. The migration may not be applied there.");
}
process.exit(res.status === 200 ? 0 : 1);
