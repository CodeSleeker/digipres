import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";
import { MessengerRepository } from "@/repositories/messenger-repository";
import { tokenCryptoConfigured } from "@/lib/messenger/token-crypto";
import { logError } from "@/lib/observability/logger";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Store a Page Access Token against an already-connected Page.
 *
 * An operator endpoint, not a product one. Meta shows a Page token exactly once
 * and the platform has one Page today, so the honest thing is a narrow authed
 * route rather than a UI nobody will use twice — Phase 5 replaces this with a
 * Facebook Login flow where each client connects their own Page.
 *
 * Guarded by CRON_SECRET, the same bearer the scheduled jobs use. That is a
 * deliberate reuse: this is operator-only, runs from a terminal, and adding a
 * second admin credential to protect one endpoint is worse than sharing the one
 * that already exists for exactly this class of call.
 *
 *   curl -X POST https://<host>/api/jobs/messenger-connect \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"pageId":"1290112807508266","token":"<PAGE_ACCESS_TOKEN>"}'
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(
    `messenger-connect:${ipFromHeaders(request.headers)}`,
    6,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /*
   * Checked before reading the body. Without the key the token cannot be
   * encrypted, and the alternative — storing it in the clear "just this once" —
   * is how a credential ends up in a database dump.
   */
  if (!tokenCryptoConfigured()) {
    return NextResponse.json(
      { error: "MESSENGER_TOKEN_ENCRYPTION_KEY is not set on this deployment." },
      { status: 503 },
    );
  }

  let body: { pageId?: unknown; token?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pageId = typeof body.pageId === "string" ? body.pageId.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!pageId || !token) {
    return NextResponse.json(
      { error: "Both pageId and token are required." },
      { status: 400 },
    );
  }

  try {
    const repo = new MessengerRepository(createServiceClient());
    const updated = await repo.setPageToken(pageId, token);

    if (!updated) {
      // The row has to exist first — this route stores a credential against a
      // channel, it does not create one. Saying so beats a silent success.
      return NextResponse.json(
        { error: `No messaging_channels row for page ${pageId}.` },
        { status: 404 },
      );
    }

    // Never echo the token back, not even a prefix.
    return NextResponse.json({ ok: true, pageId });
  } catch (error) {
    logError(error, { scope: "messenger:connect" });
    return NextResponse.json({ error: "Could not store the token." }, { status: 500 });
  }
}
