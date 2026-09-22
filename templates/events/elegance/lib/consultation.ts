/**
 * Booking a consultation, as opposed to asking about an event.
 *
 * Posts to /api/bookings, the platform's public tenant-scoped intake — the
 * same endpoint the barber and retreat forms use. That route resolves the
 * business from the request host, rate-limits, re-parses every field, creates
 * the customer and the appointment, alerts the owner and acknowledges the
 * customer by text and email.
 *
 * WHY NOT THE ENQUIRY ENDPOINT. A consultation has a date and a time; an
 * enquiry has neither. Filing one as the other would put a question in the
 * owner's calendar, count it towards the pending-bookings badge and feed the
 * review automation — which would then text someone asking them to review an
 * appointment that never happened. Migration 0036 exists because of exactly
 * that, and this is the line it draws.
 */
export interface ConsultationRequest {
  name: string;
  phone: string;
  email: string;
  /** What it is about — becomes the appointment's `service`. */
  topic: string;
  date: string;
  time: string;
  notes: string;
}

/**
 * Validate what was typed, returning the first problem.
 *
 * NOT THE TRUST BOUNDARY: /api/bookings re-parses everything with its own
 * schema. This exists so the common mistakes are answered in place rather than
 * by a round trip that returns the server's wording.
 */
export function validateConsultation(
  request: ConsultationRequest,
): string | null {
  if (!request.name.trim()) return "Please tell us your name.";
  // A booking needs a number, unlike an enquiry: the confirmation is a text,
  // and the owner rings to agree the time.
  if (!request.phone.trim()) {
    return "Please add a contact number so we can confirm the time.";
  }
  if (!request.date.trim() || !request.time.trim()) {
    return "Please choose a day and a time that suit you.";
  }

  const chosen = new Date(`${request.date}T${request.time}`);
  if (Number.isNaN(chosen.getTime())) return "Please check the date and time.";
  if (chosen.getTime() < Date.now()) {
    return "Please choose a time in the future.";
  }

  return null;
}

/** Send it. Throws with the endpoint's own wording where there is one. */
export async function submitConsultation(
  request: ConsultationRequest,
  slug: string,
): Promise<void> {
  const response = await fetch(`${window.location.origin}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: request.name,
      phone: request.phone,
      email: request.email || undefined,
      service: request.topic || "Consultation",
      date: request.date,
      time: request.time,
      notes: request.notes || undefined,
      slug,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Server error");
  }
}
