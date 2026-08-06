import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { BusinessRepository } from "@/repositories/business-repository";
import { SubscriberService } from "@/services/subscriber-service";
import { subscribeSchema } from "@/schemas/subscriber";
import { tenantSlugForRequest } from "@/lib/tenant/request-tenant";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

const IP_LIMIT = 5;
const IP_WINDOW_MS = 10 * 60_000;
const BUSINESS_LIMIT = 60;
const BUSINESS_WINDOW_MS = 60 * 60_000;

/**
 * Public mailing-list signup.
 *
 * Unauthenticated, so it is rate-limited twice: per IP, to stop one machine
 * enumerating or flooding, and per business, to cap the damage a distributed
 * run can do to any single tenant's list. The tenant is resolved from the
 * request host, never from the payload — the `slug` field is consulted only
 * where the host cannot identify a tenant (local dev, and the apex serving
 * /s/<slug>).
 *
 * ONE ANSWER FOR EVERY OUTCOME. A new signup, a repeat, an address already
 * confirmed, a business with no newsletter — all return the same 200 and the
 * same words. The alternative turns a footer box into an oracle for "is this
 * person on that bakery's list", which is a question a stranger has no business
 * being able to ask.
 */
const ACCEPTED = {
  message: "Thanks — check your email to confirm your subscription.",
} as const;

function accepted() {
  return NextResponse.json(ACCEPTED, { status: 202 });
}

export async function POST(request: NextRequest) {
  const ip = ipFromHeaders(request.headers);
  const byIp = rateLimit(`subscribe:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(payload);
  if (!parsed.success) {
    // The only field whose failure is worth reporting is the address itself —
    // everything else is optional or hidden.
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Honeypot. Discarded WITHOUT saying so: telling a bot it was caught is how
  // its author learns which field to leave alone next time.
  if (input.company && input.company.trim() !== "") return accepted();

  const slug = await tenantSlugForRequest(request, input.slug);
  if (!slug) return accepted();

  try {
    const supabase = createServiceClient();
    const business = await new BusinessRepository(supabase).findBySlug(slug);
    if (!business) return accepted();

    const byBusiness = rateLimit(
      `subscribe:business:${business.id}`,
      BUSINESS_LIMIT,
      BUSINESS_WINDOW_MS,
    );
    if (!byBusiness.ok) {
      return NextResponse.json(
        { error: "Too many sign-ups right now. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(byBusiness.retryAfter) },
        },
      );
    }

    await new SubscriberService(supabase).subscribe({
      business,
      email: input.email,
      consentText: input.consentText ?? null,
      source: input.source ?? "footer",
    });
  } catch (error) {
    /*
     * Logged, then answered as if it worked.
     *
     * Deliberate, and narrower than it looks: the visitor has no action to take
     * on our database being down, and the failure modes worth distinguishing
     * (already subscribed, no newsletter here) are ones we have already decided
     * not to reveal. A 500 would tell them something is broken without telling
     * them anything they can use.
     */
    logError(error, { scope: "api:subscribers" });
  }

  return accepted();
}
