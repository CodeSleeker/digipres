import { describe, it, expect, vi, afterEach } from "vitest";
import {
  SemaphoreSmsSender,
  semaphoreConfigFromEnv,
  semaphoreRecipient,
  startsWithTest,
} from "@/lib/sms/semaphore-sender";

describe("semaphoreRecipient", () => {
  it("drops the E.164 plus", () => {
    expect(semaphoreRecipient("+639171234567")).toBe("639171234567");
  });

  it("leaves a local-format number alone", () => {
    expect(semaphoreRecipient("09171234567")).toBe("09171234567");
  });
});

describe("startsWithTest", () => {
  // Semaphore's docs: messages starting with "TEST" are silently ignored and
  // never sent. The API still reports success, so this must be caught locally.
  it("catches the word in any case, with leading space", () => {
    expect(startsWithTest("TEST message")).toBe(true);
    expect(startsWithTest("  test this")).toBe(true);
    expect(startsWithTest("Test")).toBe(true);
  });

  it("does not fire on a word that merely begins with those letters", () => {
    expect(startsWithTest("Testimonial request")).toBe(false);
    expect(startsWithTest("Hi Juan, testing")).toBe(false);
  });
});

describe("semaphoreConfigFromEnv", () => {
  it("needs the api key", () => {
    expect(semaphoreConfigFromEnv({ SEMAPHORE_API_KEY: "k" })).toEqual({
      apiKey: "k",
    });
    expect(semaphoreConfigFromEnv({})).toBeNull();
    expect(semaphoreConfigFromEnv({ SEMAPHORE_API_KEY: " " })).toBeNull();
  });
});

describe("SemaphoreSmsSender.send", () => {
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

  /** Semaphore takes form-encoded params, not JSON. */
  function formOf(fetchMock: ReturnType<typeof mockFetch>) {
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    return new URLSearchParams(init.body);
  }

  const ok = [{ message_id: 42, status: "Queued" }];

  const send = (body: string, senderId?: string) =>
    new SemaphoreSmsSender({ apiKey: "key" }).send(
      "+639171234567",
      body,
      senderId ? { senderId } : undefined,
    );

  it("posts the documented form fields and returns the message id", async () => {
    const fetchMock = mockFetch(200, ok);

    const result = await send("Hello there", "RoniesBarb");

    expect(result).toEqual({ success: true, providerMessageId: "42" });
    const form = formOf(fetchMock);
    expect(form.get("apikey")).toBe("key");
    expect(form.get("number")).toBe("639171234567");
    expect(form.get("message")).toBe("Hello there");
    expect(form.get("sendername")).toBe("RoniesBarb");
  });

  it("OMITS sendername when the business has none, rather than sending blank", async () => {
    // Absent means "use the account's registered default Sender Name".
    // `sendername=` empty is not the same thing and is an error.
    const fetchMock = mockFetch(200, ok);

    const result = await send("Hi");

    expect(result.success).toBe(true);
    expect(formOf(fetchMock).has("sendername")).toBe(false);
  });

  it("normalizes an over-long sender ID to the 11-char limit", async () => {
    const fetchMock = mockFetch(200, ok);
    await send("Hi", "Ronie's Barber");
    expect(formOf(fetchMock).get("sendername")).toBe("Ronie s");
  });

  it("reads the message id out of the ARRAY response", async () => {
    // Semaphore returns a list even for a single recipient.
    mockFetch(200, [{ message_id: "abc", status: "Pending" }]);
    expect(await send("Hi", "Ronies")).toEqual({
      success: true,
      providerMessageId: "abc",
    });
  });

  it("treats Failed and Refunded as failures despite HTTP 200", async () => {
    for (const status of ["Failed", "Refunded"]) {
      mockFetch(200, [{ message_id: 1, status }]);
      const result = await send("Hi", "Ronies");
      expect(result.success).toBe(false);
      expect(result.error).toContain(status);
    }
  });

  it("refuses a message beginning with TEST without calling the API", async () => {
    const fetchMock = mockFetch(200, ok);
    const result = await send("TEST please ignore", "Ronies");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/TEST/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downgrades the body to GSM-7 before sending", async () => {
    const fetchMock = mockFetch(200, ok);
    await send("Ronie’s — café", "Ronies");
    expect(formOf(fetchMock).get("message")).toBe("Ronie's - café");
  });

  it("reports failure on a non-2xx, whose body is an object not an array", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(422, { number: ["The number field is required."] });
    const result = await send("Hi", "Ronies");
    expect(result.success).toBe(false);
    expect(result.error).toContain("422");
  });

  it("reports failure on an empty array rather than claiming success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(200, []);
    expect((await send("Hi", "Ronies")).success).toBe(false);
  });

  it("reports failure on a transport error instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    expect(await send("Hi", "Ronies")).toEqual({
      success: false,
      error: "network down",
    });
  });
});
