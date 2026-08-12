import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { BusinessRepository } from "@/repositories/business-repository";
import { EnquiryRepository } from "@/repositories/enquiry-repository";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
import { tenantSlugForRequest } from "@/lib/tenant/request-tenant";
import { enquiryRequestSchema } from "@/schemas/enquiry";
import { notifyOwnerOfEnquiry } from "@/lib/notifications/enquiry-notice";

/**
 * Public enquiry endpoint — a question asked of a tenant, as opposed to a
 * booking made with one. See migration 0036 for why the two are separate.
 *
 * The SECOND unauthenticated write in the app, and the trust boundary is drawn
 * exactly as the booking route draws it:
 *
 *  - The tenant comes from the request HOST, not the body (see
 *    lib/tenant/request-tenant.ts for the one bounded exception).
 *  - `findBySlug` filters on `status = 'active'`, so a suspended or deleted
 *    business silently stops accepting questions.
 *  - Every field is parsed by a narrow Zod schema. Business id and read state
 *    are NOT accepted from the caller — an enquiry always arrives unread.
 *  - Two rate limits: per IP (abuse from one source) and per business (a
 *    distributed flood still can't run up one owner's SMS bill).
 *
 * It uses the SERVICE-ROLE client, which bypasses RLS — a deliberate exception
 * for the same reason as bookings: there is no signed-in user to carry a
 * policy, and an anon INSERT policy on `enquiries` would expose the same write
 * to anyone holding the public anon key, without the host scoping, validation
 * or rate limits above. The business id written here is derived server-side and
 * never echoed from input.
 */

/** Per client IP. A question is cheaper to send than a booking, but not free. */
const IP_LIMIT = 5;
const IP_WINDOW_MS = 10 * 60 * 1000;

/** Per business. The backstop against a distributed flood of one shop. */
const BUSINESS_LIMIT = 30;
const BUSINESS_WINDOW_MS = 60 * 60 * 1000;

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const ip = ipFromHeaders(request.headers);
  const byIp = rateLimit(`enquiry:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "Too many messages. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  const parsed = enquiryRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return badRequest(first?.message ?? "Please check the form and try again.");
  }
  const enquiry = parsed.data;

  const slug = await tenantSlugForRequest(request, enquiry.slug);
  if (!slug) return badRequest("Unknown business.", 404);

  const supabase = createServiceClient();
  const business = await new BusinessRepository(supabase).findBySlug(slug);
  if (!business) return badRequest("This business isn't taking messages.", 404);

  const byBusiness = rateLimit(
    `enquiry:business:${business.id}`,
    BUSINESS_LIMIT,
    BUSINESS_WINDOW_MS,
  );
  if (!byBusiness.ok) {
    return NextResponse.json(
      { error: "Too many messages right now. Please call us instead." },
      { status: 429, headers: { "Retry-After": String(byBusiness.retryAfter) } },
    );
  }

  try {
    const saved = await new EnquiryRepository(supabase).create({
      business_id: business.id,
      name: enquiry.name,
      email: enquiry.email ?? null,
      phone: enquiry.phone ?? null,
      topic: enquiry.topic ?? null,
      message: enquiry.message,
    });

    /*
     * Awaited, not fire-and-forget: on serverless the instance can be frozen
     * the moment the response is returned, which would drop an un-awaited send.
     * `notifyOwnerOfEnquiry` never throws, so this cannot fail the enquiry —
     * which is already saved by this point.
     */
    const notified = await notifyOwnerOfEnquiry(business, {
      enquiryId: saved.id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      topic: saved.topic,
      message: saved.message,
    });

    return NextResponse.json({ ok: true, notified }, { status: 201 });
  } catch (error) {
    // Never surface the database's own message to a stranger.
    console.error("[enquiries]", error);
    return badRequest("Could not send your message. Please try again.", 500);
  }
}
