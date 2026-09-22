/**
 * The enquiry the form collects, and how it reaches the tenant.
 *
 * It posts to /api/enquiries — the platform's public, host-scoped intake, the
 * same endpoint the retreat's "I have a question" mode uses. That route
 * resolves the business from the request host, rate-limits per IP and per
 * business, re-parses every field, writes with the service-role client and
 * texts and emails the owner. None of that is re-implemented here, and none of
 * it is trusted to the browser: the checks below are a courtesy that produce a
 * better message than a 400 would.
 *
 * WHY THE EXTRA FIELDS TRAVEL IN THE MESSAGE. `enquiries` has columns for a
 * name, a reply route, a topic and a body (migration 0036). An event enquiry
 * also has a date, a venue, a guest count, a budget, a list of services and a
 * theme — six things the table cannot hold. They are composed into the body
 * rather than dropped, which is the same trade the retreat form makes with a
 * departure date and party size, and the inbox renders the body with
 * `whitespace-pre-line`, so the labelled lines survive.
 *
 * Structured columns are the upgrade when someone wants to FILTER on them
 * ("every wedding over ₱500k next spring"). That is an additive migration
 * plus a wider schema; nothing here has to be redesigned for it.
 */
export interface EventInquiry {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  venue: string;
  guests: string;
  budget: string;
  /** Checked boxes from the "services needed" list. */
  services: string[];
  theme: string;
  details: string;
}

export interface InquiryResult {
  /**
   * The code the sender quotes elsewhere, minted by the server from the saved
   * row so the owner can find it (lib/enquiries/reference.ts).
   *
   * Nullable for one real case: a browser holding this page while an older
   * deployment answers the post. Printing "undefined" as someone's reference
   * is worse than not offering one, so the success state omits the block.
   */
  reference: string | null;
}

/** The endpoint's own limit (schemas/enquiry.ts), mirrored so we can explain it. */
const MESSAGE_LIMIT = 4000;

/**
 * The six unstorable fields plus the free text, as one readable body.
 *
 * Labelled lines rather than prose: the owner is scanning an inbox, and
 * "Guests: 300" is read at a glance where a sentence has to be parsed. Blank
 * answers are omitted entirely — a column of "Venue: —" teaches nothing and
 * pushes the part they actually wrote off the card.
 *
 * Exported for the tests, and because it is the one piece worth reading when
 * someone asks what the owner will actually receive.
 */
export function composeMessage(inquiry: EventInquiry): string {
  const facts: string[] = [
    inquiry.eventDate && `Date: ${inquiry.eventDate}`,
    inquiry.venue && `Venue: ${inquiry.venue}`,
    inquiry.guests && `Guests: ${inquiry.guests}`,
    inquiry.budget && `Budget: ${inquiry.budget}`,
    inquiry.services.length > 0 && `Services: ${inquiry.services.join(", ")}`,
    inquiry.theme && `Theme: ${inquiry.theme}`,
  ].filter((line): line is string => Boolean(line));

  const body = [facts.join("\n"), inquiry.details.trim()]
    .filter(Boolean)
    .join("\n\n");

  /*
   * The endpoint requires a non-empty body, and a client can legitimately send
   * nothing but their name and the kind of event — every other field is
   * optional by design. Rejecting that would be the form refusing the shortest
   * honest enquiry it offers, so it gets a body of its own.
   */
  return body || `${inquiry.eventType} enquiry — no further details given.`;
}

/**
 * Validate what the client typed, returning the first problem.
 *
 * A message rather than a field map: the form shows one line under the button,
 * and a map would invite per-field error rendering the approved design has
 * nowhere to put.
 *
 * NOT THE TRUST BOUNDARY. /api/enquiries re-parses everything it receives with
 * its own Zod schema; this exists so the common mistakes are answered in place
 * instead of by a round trip that returns the server's wording.
 */
export function validateInquiry(inquiry: EventInquiry): string | null {
  if (!inquiry.name.trim()) return "Please tell us your name.";
  if (!inquiry.phone.trim() && !inquiry.email.trim()) {
    // Mirrors the database constraint (`enquiries_reply_route_present`): an
    // enquiry nobody can answer is worse than no enquiry.
    return "Please add a contact number or an email address so we can reply.";
  }
  if (!inquiry.eventType.trim()) return "Please choose the kind of event.";

  if (inquiry.eventDate.trim()) {
    const chosen = new Date(inquiry.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(chosen.getTime())) return "Please check the event date.";
    if (chosen < today) return "Please choose today or a future date.";
  }

  /*
   * Checked on the COMPOSED body, not on the textarea: the labelled lines
   * count towards the endpoint's limit too, so a check on `details` alone
   * would pass something the server then refuses.
   */
  if (composeMessage(inquiry).length > MESSAGE_LIMIT) {
    return "That is a little too long to send. Please shorten the details and we will cover the rest when we talk.";
  }

  return null;
}

/**
 * Send it.
 *
 * Throws on failure, carrying the server's own wording where there is one —
 * the endpoint's messages are written for the visitor ("Too many messages.
 * Please try again shortly."), and replacing them with a generic line would
 * lose the only explanation a rate-limited sender gets.
 *
 * `slug` is consulted by the endpoint ONLY when the request host doesn't
 * identify a tenant: local development, and the apex domain where sites are
 * served from /s/<slug>. On the client's own domain the host wins and this is
 * ignored, which is why it is not a trust concern.
 */
export async function submitInquiry(
  inquiry: EventInquiry,
  slug: string,
): Promise<InquiryResult> {
  const response = await fetch(`${window.location.origin}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: inquiry.name,
      // Blank means "not given" to the endpoint's schema, which is exactly
      // what an untouched input means here.
      email: inquiry.email || undefined,
      phone: inquiry.phone || undefined,
      topic: inquiry.eventType || undefined,
      message: composeMessage(inquiry),
      slug,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Server error");
  }

  const payload = await response.json().catch(() => ({}));
  return { reference: payload.reference ?? null };
}
