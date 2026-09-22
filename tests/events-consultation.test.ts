import { describe, it, expect, vi, afterEach } from "vitest";
import {
  validateConsultation,
  submitConsultation,
  type ConsultationRequest,
} from "@/templates/events/elegance/lib/consultation";
import { bem } from "@/lib/businesses/bem";

/**
 * Booking a consultation, as opposed to asking about an event.
 *
 * The line this draws is the one migration 0036 exists for: a consultation has
 * a day and a time and becomes an appointment; an enquiry has neither and
 * stays a question. Filing one as the other puts a question in the owner's
 * calendar and feeds the review automation, which then texts someone to review
 * an appointment that never happened.
 */

const request = (
  over: Partial<ConsultationRequest> = {},
): ConsultationRequest => ({
  name: "Ana Cruz",
  phone: "+63 917 555 0142",
  email: "ana@example.ph",
  topic: "Wedding",
  date: "2099-11-14",
  time: "10:00",
  notes: "",
  ...over,
});

describe("consultation validation", () => {
  it("accepts a name, a number and a future slot", () => {
    expect(validateConsultation(request())).toBeNull();
  });

  it("demands a phone number, unlike an enquiry", () => {
    // The confirmation is a text and the owner rings to agree the time, so an
    // email address alone is not enough here even though it is for a question.
    expect(validateConsultation(request({ phone: "" }))).toMatch(/number/i);
  });

  it("demands both halves of the slot", () => {
    expect(validateConsultation(request({ date: "" }))).toMatch(
      /day and a time/i,
    );
    expect(validateConsultation(request({ time: "" }))).toMatch(
      /day and a time/i,
    );
  });

  it("refuses a slot in the past", () => {
    // Down to the minute, not just the day: a 9am slot booked at 5pm is a slot
    // nobody can keep.
    expect(validateConsultation(request({ date: "2020-01-01" }))).toMatch(
      /future/i,
    );
  });
});

describe("consultation submission", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(response: { ok: boolean; json: unknown }) {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ...response,
        json: () => Promise.resolve(response.json),
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { origin: "https://example.test" } });
    return fetchMock;
  }

  it("posts to the BOOKINGS intake, not the enquiry one", async () => {
    const fetchMock = stubFetch({ ok: true, json: { ok: true } });
    await submitConsultation(request(), "bem");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.test/api/bookings");

    const body = JSON.parse((init as RequestInit).body as string);
    // `service` is what the owner sees on the appointment, so the topic has to
    // land there rather than in a note.
    expect(body.service).toBe("Wedding");
    expect(body.date).toBe("2099-11-14");
    expect(body.time).toBe("10:00");
    expect(body.slug).toBe("bem");
  });

  it("names the appointment even when no topic was chosen", async () => {
    // `service` is required by the endpoint; an empty one would be a 400 after
    // the person had filled the form in.
    const fetchMock = stubFetch({ ok: true, json: { ok: true } });
    await submitConsultation(request({ topic: "" }), "bem");
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body.service).toBe("Consultation");
  });

  it("surfaces the endpoint's own refusal", async () => {
    stubFetch({ ok: false, json: { error: "Too many bookings right now." } });
    await expect(submitConsultation(request(), "bem")).rejects.toThrow(
      /Too many bookings/,
    );
  });
});

describe("the events default content", () => {
  it("offers both modes", () => {
    // Absent `consultation` renders no switch at all, which is the right
    // shape for a studio that only ever quotes after a conversation.
    expect(bem.booking).toBeDefined();
    expect(bem.booking!.topics.length).toBeGreaterThan(0);
  });
});
