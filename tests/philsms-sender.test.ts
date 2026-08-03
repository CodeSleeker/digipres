import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PhilSmsSender,
  philSmsConfigFromEnv,
  philSmsRecipient,
} from "@/lib/sms/philsms-sender";
import { normalizeSenderId } from "@/lib/sms/sender-id";

describe("normalizeSenderId", () => {
  it("passes a short clean value through", () => {
    expect(normalizeSenderId("Ronies")).toBe("Ronies");
  });

  it("strips punctuation the carrier rejects", () => {
    expect(normalizeSenderId("Ronie's")).toBe("Ronie s");
    expect(normalizeSenderId("A&B Cuts")).toBe("A B Cuts");
  });

  it("drops whole trailing words rather than cutting mid-word", () => {
    expect(normalizeSenderId("Ronie's Barber")).toBe("Ronie s");
    expect(normalizeSenderId("Metro Manila Cuts")).toBe("Metro");
  });

  it("hard-truncates a single word that cannot fit", () => {
    expect(normalizeSenderId("Extraordinarily")).toBe("Extraordina");
    expect(normalizeSenderId("Extraordinarily")).toHaveLength(11);
  });

  it("never exceeds the 11-character GSM limit", () => {
    for (const name of [
      "Ronie's Barber",
      "The Very Long Salon Name Co",
      "AAAAAAAAAAAAAAAAAAAA",
      "Metro Manila Cuts",
    ]) {
      expect(normalizeSenderId(name)!.length).toBeLessThanOrEqual(11);
    }
  });

  it("returns null when nothing usable survives", () => {
    expect(normalizeSenderId("")).toBeNull();
    expect(normalizeSenderId("   ")).toBeNull();
    expect(normalizeSenderId("!!!")).toBeNull();
  });
});

describe("philSmsRecipient", () => {
  it("drops the E.164 plus PhilSMS does not accept", () => {
    expect(philSmsRecipient("+639977436111")).toBe("639977436111");
  });

  it("leaves an already-bare number alone", () => {
    expect(philSmsRecipient("639977436111")).toBe("639977436111");
  });
});

describe("philSmsConfigFromEnv", () => {
  it("needs only the token", () => {
    expect(philSmsConfigFromEnv({ PHILSMS_API_TOKEN: "t" })).toEqual({
      apiToken: "t",
    });
  });

  it("is null without a token", () => {
    expect(philSmsConfigFromEnv({})).toBeNull();
    expect(philSmsConfigFromEnv({ PHILSMS_API_TOKEN: "  " })).toBeNull();
  });

  it("ignores a legacy PHILSMS_SENDER_ID entirely", () => {
    // The env-level sender ID was removed in favour of businesses.sms_sender_id
    // (migration 0028). A leftover variable must not creep back into the config.
    const config = philSmsConfigFromEnv({
      PHILSMS_API_TOKEN: "t",
      PHILSMS_SENDER_ID: "Legacy",
    });
    expect(config).toEqual({ apiToken: "t" });
    expect(config).not.toHaveProperty("senderId");
  });
});

describe("PhilSmsSender.send", () => {
  afterEach(() => vi.restoreAllMocks());

  function mockFetch(status: number, body: unknown) {
    const fetchMock = vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function payloadOf(fetchMock: ReturnType<typeof mockFetch>) {
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Record<string, string> },
    ];
    return JSON.parse(init.body) as Record<string, string>;
  }

  const send = (body: string, senderId?: string) =>
    new PhilSmsSender({ apiToken: "tok" }).send(
      "+639977436111",
      body,
      senderId ? { senderId } : undefined,
    );

  it("posts the documented shape and returns the message uid", async () => {
    const fetchMock = mockFetch(200, {
      status: "success",
      data: { uid: "msg_1" },
    });

    const result = await send("Hello there", "RoniesBarb");

    expect(result).toEqual({ success: true, providerMessageId: "msg_1" });
    expect(payloadOf(fetchMock)).toEqual({
      recipient: "639977436111",
      sender_id: "RoniesBarb",
      type: "plain",
      message: "Hello there",
    });
  });

  it("takes the sender ID from the per-business option and nowhere else", async () => {
    const fetchMock = mockFetch(200, { status: "success" });
    await send("Hi", "Ronie's Barber");
    expect(payloadOf(fetchMock).sender_id).toBe("Ronie s");
  });

  it("refuses to send when the business has no sender ID", async () => {
    // PhilSMS has no account-level default, so there is nothing to fall back
    // to — failing before the HTTP call beats decoding their rejection later.
    const fetchMock = mockFetch(200, { status: "success" });

    const result = await send("Hi");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/sender ID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downgrades the body to GSM-7 before sending", async () => {
    const fetchMock = mockFetch(200, { status: "success" });
    await send("Ronie’s — café", "Ronies");
    expect(payloadOf(fetchMock).message).toBe("Ronie's - café");
  });

  it("reports failure on an error status inside a 200 body", async () => {
    // PhilSMS answers 200 with { status: "error" } for some rejections, so HTTP
    // status alone would mark an undelivered message as sent.
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(200, { status: "error", message: "Invalid sender id" });

    const result = await send("Hi", "Nope");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid sender id");
  });

  it("reports failure on a transport error instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const result = await send("Hi", "Ronies");

    expect(result).toEqual({ success: false, error: "network down" });
  });

  it("sends the token as a bearer credential", async () => {
    const fetchMock = mockFetch(200, { status: "success" });
    await send("Hi", "Ronies");
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe("Bearer tok");
  });
});
