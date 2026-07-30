import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { BusinessRepository } from "@/repositories/business-repository";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
import { tenantSlugForRequest } from "@/lib/tenant/request-tenant";
import {
  bookingRequestSchema,
  bookingStartsAt,
  isPastDate,
} from "@/schemas/booking";
import { notifyOwnerOfBooking } from "@/lib/notifications/booking-notice";
import { toE164 } from "@/lib/sms/phone";
import { revalidateTenantSite } from "@/lib/tenant/revalidate";

/**
 * Public booking endpoint — the target of the contact form on every tenant
 * website (templates/barber/luxury/sections/contact.tsx).
 *
 * This is the only UNAUTHENTICATED write in the app, so the trust boundary is
 * drawn explicitly:
 *
 *  - The tenant comes from the request HOST, not the body (see
 *    lib/tenant/request-tenant.ts for the one bounded exception).
 *  - `findBySlug` filters on `status = 'active'`, so a suspended or deleted
 *    business silently stops accepting bookings.
 *  - Every field is parsed by a narrow Zod schema. Status, business id and
 *    customer id are NOT accepted from the caller — a booking is always
 *    'scheduled'. Letting the body set 'completed' would fire the review
 *    automation, and with it outbound SMS, on demand.
 *  - Two rate limits: per IP (abuse from one source) and per business (a
 *    distributed flood still can't run up one owner's SMS bill).
 *
 * It uses the SERVICE-ROLE client, which bypasses RLS. That is a deliberate
 * exception to the warning in lib/supabase/service.ts: there is no signed-in
 * user to carry a policy, and the alternative — an anon INSERT policy on
 * `appointments` — would expose the same write to anyone holding the public
 * anon key, without the host scoping, validation or rate limits above. The
 * business id written here is derived server-side and never echoed from input.
 */

/** Per client IP. Generous enough for a family booking together on one wifi. */
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
  const byIp = rateLimit(`booking:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  const parsed = bookingRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return badRequest(first?.message ?? "Please check the form and try again.");
  }
  const booking = parsed.data;

  if (isPastDate(booking.date)) {
    return badRequest("Please choose today or a future date.");
  }

  const slug = await tenantSlugForRequest(request, booking.slug);
  if (!slug) return badRequest("Unknown business.", 404);

  const supabase = createServiceClient();
  const business = await new BusinessRepository(supabase).findBySlug(slug);
  if (!business) return badRequest("This business isn't taking bookings.", 404);

  const byBusiness = rateLimit(
    `booking:business:${business.id}`,
    BUSINESS_LIMIT,
    BUSINESS_WINDOW_MS,
  );
  if (!byBusiness.ok) {
    return NextResponse.json(
      { error: "Too many bookings right now. Please call us instead." },
      { status: 429, headers: { "Retry-After": String(byBusiness.retryAfter) } },
    );
  }

  try {
    const customerId = await upsertCustomer(supabase, business.id, booking);

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        business_id: business.id,
        customer_id: customerId,
        service: booking.service,
        staff: booking.barber ?? null,
        // Never from the caller — see the note at the top of this file.
        status: "scheduled",
        starts_at: bookingStartsAt(booking.date, booking.time),
        notes: appointmentNotes(booking, customerId),
      })
      .select("id")
      .single();
    if (error) throw error;

    // Awaited, not fire-and-forget: on serverless the instance can be frozen
    // the moment the response is returned, which would drop an un-awaited send.
    // `notifyOwnerOfBooking` never throws, so this cannot fail the booking.
    const notified = await notifyOwnerOfBooking(business, {
      appointmentId: appointment.id,
      customerName: booking.name,
      customerPhone: booking.phone,
      service: booking.service,
      staff: booking.barber ?? null,
      date: booking.date,
      time: booking.time,
      notes: booking.notes ?? null,
    });
    console.info(
      "[booking] business=%s appointment=%s sms=%s email=%s",
      business.slug,
      appointment.id,
      notified.sms,
      notified.email,
    );

    // The public page is ISR-cached; nothing on it shows bookings today, but
    // keeping the tenant's cache honest costs nothing and avoids a surprise if
    // a template ever renders availability.
    revalidateTenantSite(business.slug);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    // Never leak a database message to a public caller.
    console.error("[booking]", error);
    return badRequest("Could not save your booking. Please try again.", 500);
  }
}

/**
 * The customer's own message, plus their contact details IF the customer record
 * couldn't be written.
 *
 * Without that fallback a failed customer insert would strand an appointment
 * with no name and no phone number on it — the owner would see a booking they
 * have no way to answer. Duplicating the details in the normal case would just
 * be noise, since the dashboard already resolves them from the customer row.
 */
function appointmentNotes(
  booking: { name: string; phone: string; notes?: string },
  customerId: string | null,
): string | null {
  const parts: string[] = [];
  if (!customerId) parts.push(`From: ${booking.name} (${booking.phone})`);
  if (booking.notes) parts.push(booking.notes);
  return parts.length ? parts.join("\n\n") : null;
}

/**
 * Attach the booking to a customer record, reusing one when the same phone
 * number books again.
 *
 * Matching on the normalized number rather than the raw string: "0917 123 4567"
 * and "+639171234567" are the same person, and a new row per formatting variant
 * would fragment their history and the review automation that reads it.
 */
async function upsertCustomer(
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  booking: { name: string; phone: string },
): Promise<string | null> {
  const mobile = toE164(booking.phone) ?? booking.phone.trim();

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .eq("mobile", mobile)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("customers")
    .insert({ business_id: businessId, name: booking.name, mobile })
    .select("id")
    .single();
  if (error) {
    // A customer row is a convenience, not the booking. Losing it must not
    // lose the appointment, which can stand on its own with the notes.
    console.error("[booking:customer]", error);
    return null;
  }
  return data.id;
}
