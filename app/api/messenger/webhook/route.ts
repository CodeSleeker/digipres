import { NextResponse, type NextRequest } from "next/server";
import {
  isValidMetaSignature,
  verifyChallenge,
} from "@/lib/messenger/signature";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Messenger webhook — phase 1a: the handshake and the door.
 *
 * This route makes Meta's callback verification pass and authenticates every
 * delivery that follows. It deliberately does NOT yet store conversations:
 * `messaging_channels`, `conversations` and `messenger_messages` (with RLS,
 * encrypted Page tokens and `mid` dedupe) are the rest of phase 1, and none of
 * them are needed to turn the callback screen green. See docs/messenger-ai.md.
 *
 * Until that lands, a verified delivery is acknowledged and dropped. That is a
 * deliberate no-op rather than a silent failure — the alternative, holding the
 * subscription open with no endpoint at all, is what blocks the whole setup.
 */

/**
 * Meta's callback verification (GET).
 *
 * Answered with the challenge as PLAIN TEXT. Meta compares the body byte for
 * byte, so a JSON-wrapped or quoted challenge fails the check even though the
 * value is right.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!expected) {
    // 503, not 403: nothing is wrong with the caller. Distinguishing the two is
    // what tells you "I forgot the env var" from "I typed the token wrong" —
    // and from Meta's side both otherwise look like one generic failure.
    return new NextResponse("Messenger webhook not configured", {
      status: 503,
    });
  }

  const challenge = verifyChallenge(
    expected,
    request.nextUrl.searchParams,
  );
  if (challenge === null) {
    return new NextResponse("Verification failed", { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Event delivery (POST).
 *
 * Two rules from docs/messenger-ai.md shape this handler:
 *
 *  - VERIFY BEFORE PARSING. The signature covers the raw bytes, so the body is
 *    read as text and only then parsed. Reading it as JSON first would make the
 *    digest unreproducible.
 *  - ACK FAST. Meta retries when a 200 doesn't arrive in ~20s and disables a
 *    subscription that keeps failing, so nothing slow may run before the
 *    response. When message handling lands it goes in a background task, never
 *    inline.
 */
export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    return new NextResponse("Messenger webhook not configured", {
      status: 503,
    });
  }

  const rawBody = await request.text();

  if (
    !isValidMetaSignature(
      appSecret,
      rawBody,
      request.headers.get("x-hub-signature-256"),
    )
  ) {
    // No detail in the body: this endpoint is public, and an unsigned caller
    // learns nothing beyond "rejected".
    return new NextResponse("Invalid signature", { status: 403 });
  }

  /*
   * Parsed only to confirm the payload is the shape we expect, and logged so a
   * test message from the Meta dashboard is visibly ARRIVING while the storage
   * half is still being built. A malformed body from a correctly signed sender
   * is Meta's problem, not a reason to fail the delivery — the ACK still goes
   * back, because a non-200 would have Meta retry a payload we cannot use.
   */
  try {
    const payload = JSON.parse(rawBody) as { object?: string };
    if (payload.object !== "page") {
      logError(new Error(`Unexpected webhook object: ${payload.object}`), {
        scope: "messenger:webhook",
      });
    }
  } catch (error) {
    logError(error, { scope: "messenger:webhook:parse" });
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
