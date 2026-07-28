import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidTwilioSignature } from "@/lib/sms/twilio-signature";
import { applyOptIn, applyOptOut } from "@/features/sms/opt-out";
import { logError } from "@/lib/observability/logger";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// Twilio's standard opt-out / opt-in keywords (first word of the message).
const OPT_OUT = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const OPT_IN = new Set(["START", "YES", "UNSTOP"]);

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * Twilio inbound-SMS webhook. Reflects carrier opt-out/opt-in into our data so
 * queued messages stop and future sends are suppressed. The Messaging Service's
 * Advanced Opt-Out is the primary enforcement (blocks at the carrier); this
 * mirrors it so `startForAppointment` won't even queue.
 *
 * Requests are authenticated by the Twilio signature — without it, anyone could
 * opt numbers in/out.
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(`sms-inbound:${ipFromHeaders(request.headers)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json({ error: "SMS not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = typeof value === "string" ? value : "";
  }

  // Twilio signs the exact configured URL; set TWILIO_WEBHOOK_URL when behind a
  // proxy so it matches (request.url can differ from the public URL).
  const url = process.env.TWILIO_WEBHOOK_URL ?? request.url;
  if (
    !isValidTwilioSignature(
      authToken,
      url,
      params,
      request.headers.get("x-twilio-signature"),
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = (params.From ?? "").trim();
  const keyword = (params.Body ?? "")
    .trim()
    .split(/\s+/)[0]
    ?.toUpperCase()
    .replace(/[^A-Z]/g, "");

  if (from && keyword) {
    try {
      const supabase = createServiceClient();
      if (OPT_OUT.has(keyword)) await applyOptOut(supabase, from);
      else if (OPT_IN.has(keyword)) await applyOptIn(supabase, from);
    } catch (error) {
      // Carrier-level opt-out still applies even if our mirror fails; log only.
      logError(error, { scope: "sms:inbound" });
    }
  }

  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
