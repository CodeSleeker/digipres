import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PhilSmsSender,
  normalizeSenderId,
  philSmsConfigFromEnv,
  philSmsRecipient,
} from "@/lib/sms/philsms-sender";

describe("normalizeSenderId", () => {
  it("passes a short clean name through", () => {
    expect(normalizeSenderId("Ronies")).toBe("Ronies");
  });

  it("strips punctuation the carrier rejects", () => {
    expect(normalizeSenderId("Ronie's")).toBe("Ronie s");
    expect(normalizeSenderId("A&B Cuts")).toBe("A B Cuts");
  });

  it("drops whole trailing words rather than cutting mid-word", () => {
    // 13 chars once cleaned, so it must shorten — at the space, not at 11.
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
      senderId: undefined,
    });
  });

  it("is null without a token", () => {
    expect(philSmsConfigFromEnv({ PHILSMS_SENDER_ID: "X" })).toBeNull();
  });

  it("treats a blank sender ID as dynamic, not as a value", () => {
    const config = philSmsConfigFromEnv({
      PHILSMS_API_TOKEN: "t",
      PHILSMS_SENDER_ID: "   ",
    });
    expect(config?.senderId).toBeUndefined();
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

  it("posts the documented shape and returns the message uid", async () => {
    const fetchMock = mockFetch(200, {
      status: "success",
      data: { uid: "msg_1" },
    });

    const result = await new PhilSmsSender({
      apiToken: "tok",
      senderId: "PhilSMS",
    }).send("+639977436111", "Test");

    expect(result).toEqual({ success: true, providerMessageId: "msg_1" });
    expect(payloadOf(fetchMock)).toEqual({
      recipient: "639977436111",
      sender_id: "PhilSMS",
      type: "plain",
      message: "Test",
    });
  });

  it("uses the business name when no fixed sender ID is configured", async () => {
    const fetchMock = mockFetch(200, { status: "success" });

    await new PhilSmsSender({ apiToken: "tok" }).send("+639170000000", "Hi", {
      senderId: "Ronie's Barber",
    });

    expect(payloadOf(fetchMock).sender_id).toBe("Ronie s");
  });

  it("lets a configured sender ID WIN over the business name", async () => {
    // The whole point of the fixed setting: only one label is approved with the
    // carrier, so tenant data must not be able to override it into a rejection.
    const fetchMock = mockFetch(200, { status: "success" });

    await new PhilSmsSender({ apiToken: "tok", senderId: "PhilSMS" }).send(
      "+639170000000",
      "Hi",
      { senderId: "Ronies Barber" },
    );

    expect(payloadOf(fetchMock).sender_id).toBe("PhilSMS");
  });

  it("fails loudly rather than posting an empty sender_id", async () => {
    const fetchMock = mockFetch(200, { status: "success" });

    const result = await new PhilSmsSender({ apiToken: "tok" }).send(
      "+639170000000",
      "Hi",
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/sender ID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports failure on an error status inside a 200 body", async () => {
    // PhilSMS answers 200 with { status: "error" } for some rejections, so HTTP
    // status alone would mark an undelivered message as sent.
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(200, { status: "error", message: "Invalid sender id" });

    const result = await new PhilSmsSender({
      apiToken: "tok",
      senderId: "Nope",
    }).send("+639170000000", "Hi");

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

    const result = await new PhilSmsSender({
      apiToken: "tok",
      senderId: "X",
    }).send("+639170000000", "Hi");

    expect(result).toEqual({ success: false, error: "network down" });
  });

  it("sends the token as a bearer credential", async () => {
    const fetchMock = mockFetch(200, { status: "success" });
    await new PhilSmsSender({ apiToken: "tok", senderId: "X" }).send(
      "+639170000000",
      "Hi",
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe("Bearer tok");
  });
});
