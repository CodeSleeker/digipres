import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SubscriberService } from "@/services/subscriber-service";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * The `List-Unsubscribe` endpoint (RFC 8058).
 *
 * This is what Gmail's and Outlook's own Unsubscribe button calls: a POST, made
 * by the MAIL PROVIDER rather than by a browser, with no session, no cookies
 * and nobody watching the response. So it does the work and answers 200 — there
 * is no page to render and no person to tell.
 *
 * Separate from the /unsubscribe PAGE because a Next.js route segment cannot be
 * both. The email carries both: this URL in the header for the client's button,
 * and the page in the body for the reader who scrolls.
 *
 * ALWAYS 200, even for a token that matches nothing. A provider that gets an
 * error may retry, or may score the sender down for a broken unsubscribe — and
 * neither outcome is worth reporting a failure nobody reads.
 */
async function handle(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await new SubscriberService(createServiceClient()).unsubscribe(token);
  } catch (error) {
    logError(error, { scope: "api:unsubscribe" });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  await handle(searchParams.get("token"));
  return new NextResponse(null, { status: 200 });
}

/**
 * Some clients follow the header with a GET instead of posting. Send those to
 * the page, which does the same thing and says so.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  return NextResponse.redirect(
    `${origin}/unsubscribe?token=${encodeURIComponent(token)}`,
  );
}
