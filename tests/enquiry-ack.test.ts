import { describe, it, expect, vi } from "vitest";
import {
  acknowledgeEnquiry,
  enquiryAckSms,
  enquiryAckEmailSubject,
  enquiryAckEmailText,
  type EnquiryAck,
} from "@/lib/notifications/enquiry-ack";
import { isGsm7, smsSegments } from "@/lib/sms/gsm7";

/**
 * The receipt a member of the public gets for their own enquiry.
 *
 * Distinct from enquiry-notice.ts, which tells the owner. The constraints here
 * are the stricter ones: this message goes to a stranger, so it has to fit one
 * segment whatever they typed into the form, and it has to carry the reference
 * they were shown on screen or the two do not match.
 */

const ack = (over: Partial<EnquiryAck> = {}): EnquiryAck => ({
  reference: "ENQ-3F7A-92C1",
  name: "Ana Cruz",
  email: "ana@example.ph",
  phone: "+639175550142",
  topic: "Wedding",
  ...over,
});

describe("enquiry acknowledgement SMS", () => {
  it("carries the reference the success panel showed", () => {
    // The whole point of texting at all: something they can quote back later,
    // after the tab is closed.
    expect(enquiryAckSms("Elegance by Bem", ack())).toContain("ENQ-3F7A-92C1");
  });

  it("greets them by first name, not their full legal name", () => {
    const body = enquiryAckSms("Elegance by Bem", ack());
    expect(body).toContain("Hi Ana,");
    expect(body).not.toContain("Ana Cruz");
  });

  it("stays inside one GSM-7 segment", () => {
    const body = enquiryAckSms("Elegance by Bem", ack());
    expect(isGsm7(body), body).toBe(true);
    expect(smsSegments(body).segments).toBe(1);
  });

  it("stays inside one segment when every field is over-long", () => {
    // The name is typed by a stranger and the business name by the client.
    // Neither may be allowed to add a segment, which doubles the cost and
    // arrives as two texts.
    const body = enquiryAckSms("A".repeat(120), ack({ name: "B".repeat(120) }));
    expect(isGsm7(body), body).toBe(true);
    expect(smsSegments(body).segments).toBe(1);
  });

  it("uses no em dash, the character that tripled the booking alert", () => {
    // One non-GSM-7 character drops the budget from 160 to 70.
    const body = enquiryAckSms("Elegance by Bem", ack());
    expect(body).not.toMatch(/[—–’“”]/);
  });
});

describe("enquiry acknowledgement email", () => {
  it("puts the reference in the subject, where it survives being filed", () => {
    const subject = enquiryAckEmailSubject("Elegance by Bem", ack());
    expect(subject).toContain("ENQ-3F7A-92C1");
    expect(subject).toContain("Elegance by Bem");
  });

  it("says it arrived, what the reference is, and when to expect a reply", () => {
    const text = enquiryAckEmailText("Elegance by Bem", ack());
    expect(text).toContain("ENQ-3F7A-92C1");
    expect(text).toMatch(/one working day/i);
    expect(text).toContain("Elegance by Bem");
  });

  it("does not read back everything they just typed", () => {
    // They filled the form seconds ago. Repeating their answers reads as a
    // database dump rather than a reply from a person.
    const text = enquiryAckEmailText("Elegance by Bem", ack());
    expect(text).not.toContain("ana@example.ph");
    expect(text).not.toContain("+639175550142");
  });

  it("names the topic only when there is one", () => {
    expect(enquiryAckEmailText("X", ack())).toContain("About: Wedding");
    expect(enquiryAckEmailText("X", ack({ topic: null }))).not.toContain(
      "About:",
    );
  });
});

/**
 * The guards, which are the part worth testing.
 *
 * The senders fall back to their logging stubs with no provider configured
 * (lib/email/sender.ts, lib/sms/sender.ts) and report success, so what these
 * assert is which channels were ATTEMPTED — the decisions, not the delivery.
 */

/** Just enough of the chain `isNumberOptedOut` walks. */
function fakeSupabase(result: {
  data?: { id: string } | null;
  error?: unknown;
}) {
  const calls: Record<string, unknown>[] = [];
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      calls.push({ [col]: val });
      return chain;
    },
    is: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
  };
  return {
    client: { from: () => chain } as never,
    calls,
  };
}

const business = (over: Record<string, unknown> = {}) =>
  ({
    name: "Elegance by Bem",
    slug: "elegancebybem",
    notifyCustomerSms: true,
    smsSenderId: "EleganceByBem",
    notifyEmail: "booking@elegancebybem.com",
    email: null,
    notifyPhone: null,
    phone: null,
    ...over,
  }) as never;

describe("acknowledgeEnquiry", () => {
  it("sends on both channels when it can", async () => {
    const { client } = fakeSupabase({ data: null });
    expect(await acknowledgeEnquiry(client, business(), ack())).toEqual({
      email: "sent",
      sms: "sent",
    });
  });

  it("REFUSES to text a number that replied STOP", async () => {
    // Opt-out is recorded across every tenant, and an enquirer has no customer
    // record of their own — so the lookup is by number. Honouring it is not
    // optional. The email still goes: opting out of texts is not opting out of
    // a reply to the enquiry they just sent.
    const { client } = fakeSupabase({ data: { id: "c1" } });
    expect(await acknowledgeEnquiry(client, business(), ack())).toEqual({
      email: "sent",
      sms: "skipped",
    });
  });

  it("treats an unreadable opt-out list as opted out", async () => {
    // Being unable to check is not permission to send.
    const { client } = fakeSupabase({ error: new Error("db down") });
    const result = await acknowledgeEnquiry(client, business(), ack());
    expect(result.sms).toBe("skipped");
    expect(result.email).toBe("sent");
  });

  it("honours the tenant's own customer-SMS switch", async () => {
    // 'disabled', not 'skipped', so the log says which reason applied.
    const { client } = fakeSupabase({ data: null });
    const result = await acknowledgeEnquiry(
      client,
      business({ notifyCustomerSms: false }),
      ack(),
    );
    expect(result.sms).toBe("disabled");
    expect(result.email).toBe("sent");
  });

  it("uses whichever channel they actually gave", async () => {
    // The schema guarantees one of the two, never both.
    const { client } = fakeSupabase({ data: null });
    expect(
      await acknowledgeEnquiry(client, business(), ack({ phone: null })),
    ).toEqual({ email: "sent", sms: "skipped" });
    expect(
      await acknowledgeEnquiry(client, business(), ack({ email: null })),
    ).toEqual({ email: "skipped", sms: "sent" });
  });

  it("looks the number up in E.164, the form the opt-out list stores", async () => {
    // A number typed as 0917... would never match a stored +63917... row, and
    // the opt-out would be silently missed. Normalising needs the deployment's
    // default region — without SMS_DEFAULT_COUNTRY_CODE a nationally written
    // number cannot be resolved at all, which the next test pins down.
    vi.stubEnv("SMS_DEFAULT_COUNTRY_CODE", "63");
    const { client, calls } = fakeSupabase({ data: null });
    await acknowledgeEnquiry(
      client,
      business(),
      ack({ phone: "0917 555 0142" }),
    );
    expect(calls).toContainEqual({ mobile: "+639175550142" });
    vi.unstubAllEnvs();
  });

  it("skips the text rather than guessing when the region is unset", async () => {
    /*
     * A real deployment concern, not a test artefact: with no
     * SMS_DEFAULT_COUNTRY_CODE, "0917 555 0142" cannot be turned into a
     * diallable number, and guessing one would text a stranger in whatever
     * country the digits happened to match. Skipping is the safe answer, and
     * the email still goes.
     */
    vi.stubEnv("SMS_DEFAULT_COUNTRY_CODE", "");
    const { client } = fakeSupabase({ data: null });
    const result = await acknowledgeEnquiry(
      client,
      business(),
      ack({ phone: "0917 555 0142" }),
    );
    expect(result.sms).toBe("skipped");
    expect(result.email).toBe("sent");
    vi.unstubAllEnvs();
  });
});
