import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isValidMetaSignature,
  verifyChallenge,
} from "@/lib/messenger/signature";
import { inboundEventsFrom } from "@/lib/messenger/payload";
import { MessengerRepository } from "@/repositories/messenger-repository";
import type { MessengerWebhookBody } from "@/types/messenger";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Messenger webhook — phase 1 of docs/messenger-ai.md.
 *
 * Verifies Meta's callback handshake, authenticates every delivery against the
 * app secret, and persists inbound messages against the Page's channel.
 *
 * It does NOT reply. Generating an answer means an LLM call, which cannot run
 * before the acknowledgement without risking Meta's ~20s deadline — that is
 * phase 2, and it runs in the background off the back of these rows.
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
  const header = request.headers.get("x-hub-signature-256");

  if (!isValidMetaSignature(appSecret, rawBody, header)) {
    /*
     * LOG THE REJECTION, don't just refuse it.
     *
     * A 403 here is indistinguishable from Meta never calling at all: both
     * leave empty tables and an empty log. That ambiguity cost an afternoon,
     * so the three causes are now told apart in the log itself —
     *
     *   no header        Meta didn't sign it, or something else is posting here
     *   sha1= present    an older app signing scheme we deliberately don't accept
     *   digest mismatch  META_APP_SECRET here differs from the app that signed
     *
     * The signature itself is not logged: it is a keyed digest of the body, and
     * writing it out hands an attacker a valid one to replay.
     */
    const reason = !header
      ? "no x-hub-signature-256 header"
      : header.startsWith("sha1=")
        ? "sha1 signature offered; only sha256 is accepted"
        : "digest mismatch — META_APP_SECRET may not match the signing app";
    logError(new Error(`Rejected webhook delivery: ${reason}`), {
      scope: "messenger:webhook:signature",
      bodyBytes: rawBody.length,
      otherSignatureHeader: Boolean(request.headers.get("x-hub-signature")),
    });

    // No detail in the body: this endpoint is public, and an unsigned caller
    // learns nothing beyond "rejected".
    return new NextResponse("Invalid signature", { status: 403 });
  }

  /*
   * A malformed body from a correctly signed sender is acknowledged, not
   * retried. Meta signed it, so it is not a transport error — replaying it would
   * fail identically every time until the subscription is disabled.
   */
  let body: MessengerWebhookBody;
  try {
    body = JSON.parse(rawBody) as MessengerWebhookBody;
  } catch (error) {
    logError(error, { scope: "messenger:webhook:parse" });
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  if (body.object !== "page") {
    logError(new Error(`Unexpected webhook object: ${body.object}`), {
      scope: "messenger:webhook",
    });
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  try {
    await persist(body);
  } catch (error) {
    /*
     * A STORAGE failure is the one case worth a non-200.
     *
     * Meta retries a failed delivery, and `mid` is unique, so a retry either
     * lands the message that was lost or is deduped away — whereas acking here
     * would discard a customer's message permanently to protect the
     * subscription. The subscription is recoverable; the message is not.
     */
    logError(error, { scope: "messenger:webhook:persist" });
    return new NextResponse("Storage failed", { status: 500 });
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

/**
 * Resolve each event to its Page's channel and store it.
 *
 * Sequential rather than parallel: several events in one delivery are usually
 * the same person on the same thread, and `ensureConversation` upserting
 * concurrently against itself is exactly the contention the unique constraint
 * would then have to arbitrate on every message.
 */
async function persist(body: MessengerWebhookBody): Promise<void> {
  const events = inboundEventsFrom(body);
  if (events.length === 0) return;

  const repo = new MessengerRepository(createServiceClient());
  /** Page id → channel, so one delivery resolves each Page once. */
  const channels = new Map<string, Awaited<
    ReturnType<MessengerRepository["findChannelByPageId"]>
  >>();

  for (const event of events) {
    if (!channels.has(event.pageId)) {
      channels.set(event.pageId, await repo.findChannelByPageId(event.pageId));
    }
    const channel = channels.get(event.pageId) ?? null;

    /*
     * A Page Meta delivers for but nobody connected here.
     *
     * Normal, not exceptional: the app is subscribed at the Page level in the
     * Meta dashboard, and that can happen before — or without — a
     * `messaging_channels` row. Logged once per delivery so connecting a Page in
     * one place and not the other is visible rather than mysterious.
     */
    if (!channel) {
      logError(new Error(`No channel for page ${event.pageId}`), {
        scope: "messenger:webhook:unknown-page",
      });
      continue;
    }

    const conversationId = await repo.ensureConversation(
      channel.id,
      event.psid,
    );

    await repo.recordInbound({
      conversationId,
      mid: event.mid,
      text: event.text,
      payload: event.payload,
    });

    // Outside the dedupe check on purpose: a redelivery still proves the
    // customer wrote at that time, and this value gates whether we may reply.
    await repo.touchCustomerActivity(conversationId, event.sentAt);
  }
}
