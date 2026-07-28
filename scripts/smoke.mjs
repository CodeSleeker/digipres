/**
 * Basic end-to-end smoke test. Runs against a live server (BASE_URL, default
 * http://localhost:3000) and asserts the critical routes respond correctly:
 *  - /login renders (public)
 *  - / renders the public tenant site (falls back to the template default)
 *  - /admin redirects unauthenticated users to /login (auth gate)
 *  - an unknown tenant slug 404s (routing isolation)
 *
 * Plain Node + fetch — no test framework or browser driver. Exits non-zero on
 * the first failed expectation so CI fails loudly. Includes a startup wait so
 * no extra "wait-on" dependency is needed.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${BASE_URL} did not start within ${timeoutMs}ms`);
}

const checks = [
  { path: "/login", expect: [200], note: "login page renders" },
  { path: "/", expect: [200], note: "public site renders" },
  { path: "/admin", expect: [307, 302], note: "admin redirects to login" },
  { path: "/s/__no_such_tenant__", expect: [404], note: "unknown tenant 404s" },
  // The super admin portal reads across every tenant — it must never be
  // reachable without a session, and never be a 200 to an anonymous caller.
  {
    path: "/platform",
    expect: [307, 302],
    note: "platform portal redirects to login",
  },
  {
    path: "/platform/businesses",
    expect: [307, 302],
    note: "platform sub-route redirects too (not just the index)",
  },
  {
    path: "/platform/audit",
    expect: [307, 302],
    note: "audit trail redirects to login",
  },
  // Job endpoints must reject an unauthenticated caller outright — a 200 here
  // would mean anyone on the internet can trigger sends or a data purge.
  {
    path: "/api/jobs/review-automation",
    expect: [401],
    note: "cron route rejects a call with no secret",
  },
  {
    path: "/api/jobs/retention",
    expect: [401],
    note: "retention route rejects a call with no secret",
  },
];

async function main() {
  await waitForServer();
  let failed = 0;
  for (const c of checks) {
    let status = 0;
    try {
      const res = await fetch(`${BASE_URL}${c.path}`, { redirect: "manual" });
      status = res.status;
    } catch (err) {
      status = -1;
      console.error(`  fetch error: ${err}`);
    }
    const ok = c.expect.includes(status);
    if (!ok) failed++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${c.path} -> ${status}  (expect ${c.expect.join("/")}) — ${c.note}`,
    );
  }
  console.log(
    `\n${checks.length - failed}/${checks.length} smoke checks passed`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
