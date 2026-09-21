/**
 * The enquiry payload, and the seam a backend will slot into.
 *
 * Deliberately a plain shape with no transport: the form collects and
 * validates, and `submitInquiry` is the single function to replace when the
 * intake endpoint exists. Nothing else in the section knows how an enquiry
 * travels, so wiring it up later is one file, not a redesign.
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
  /** Shown back to the client so they can quote it in a message. */
  reference: string;
}

/**
 * A human-quotable reference.
 *
 * Date-prefixed so an owner reading one in a Messenger thread knows roughly
 * when it was raised, and short enough to be read aloud over the phone. The
 * random tail uses an alphabet with no 0/O or 1/I, because these get
 * transcribed by hand.
 */
export function makeReference(now: Date = new Date()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const stamp =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  let tail = "";
  const random = globalThis.crypto?.getRandomValues
    ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(4)))
    : Array.from({ length: 4 }, () => Math.floor(Math.random() * 256));
  for (const byte of random) tail += alphabet[byte % alphabet.length];

  return `EB-${stamp}-${tail}`;
}

/**
 * Where the enquiry goes.
 *
 * FRONTEND PLACEHOLDER. It validates nothing a server would have to trust and
 * sends nothing anywhere — it mints a reference and resolves, so the form's
 * success state is real and testable today. When the intake lands, this body
 * becomes the POST and its signature does not change.
 *
 * The delay is not decoration: without it the pending state never renders, and
 * a submit button that never shows progress is one nobody knows they pressed.
 */
export async function submitInquiry(
  inquiry: EventInquiry,
): Promise<InquiryResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  // Referenced so the parameter is part of the contract rather than dead
  // weight a later reader might delete along with the seam.
  void inquiry;
  return { reference: makeReference() };
}

/**
 * Validate what the client typed, returning the first problem.
 *
 * Returns a message rather than a field map: the form shows one line under the
 * button, and a map would invite per-field error rendering the approved design
 * has nowhere to put.
 */
export function validateInquiry(inquiry: EventInquiry): string | null {
  if (!inquiry.name.trim()) return "Please tell us your name.";
  if (!inquiry.phone.trim() && !inquiry.email.trim()) {
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

  return null;
}
