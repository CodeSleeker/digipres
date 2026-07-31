import { describe, it, expect, afterEach, vi } from "vitest";
import { getSmsSender } from "@/lib/sms/sender";
import { TwilioSmsSender } from "@/lib/sms/twilio-sender";
import { PhilSmsSender } from "@/lib/sms/philsms-sender";

/**
 * Provider selection: the carrier named by SMS_PROVIDER, an auto-detect when
 * it's blank, and a no-op stub when nothing is configured.
 * (The send() HTTP calls are exercised in philsms-sender.test.ts.)
 */
const TWILIO = {
  TWILIO_ACCOUNT_SID: "AC_test",
  TWILIO_AUTH_TOKEN: "token_test",
  TWILIO_MESSAGING_SERVICE_SID: "MG_test",
};

describe("getSmsSender auto-detect (SMS_PROVIDER blank)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("falls back to the stub when no carrier env is present", () => {
    const sender = getSmsSender({});
    expect(sender).not.toBeInstanceOf(TwilioSmsSender);
    expect(sender).not.toBeInstanceOf(PhilSmsSender);
  });

  it("uses Twilio when credentials + a messaging service are set", () => {
    expect(getSmsSender(TWILIO)).toBeInstanceOf(TwilioSmsSender);
  });

  it("uses Twilio with a From number instead of a messaging service", () => {
    expect(
      getSmsSender({
        TWILIO_ACCOUNT_SID: "AC_test",
        TWILIO_AUTH_TOKEN: "token_test",
        TWILIO_FROM_NUMBER: "+15551234567",
      }),
    ).toBeInstanceOf(TwilioSmsSender);
  });

  it("stays on the stub when credentials exist but no sender is configured", () => {
    expect(
      getSmsSender({
        TWILIO_ACCOUNT_SID: "AC_test",
        TWILIO_AUTH_TOKEN: "token_test",
      }),
    ).not.toBeInstanceOf(TwilioSmsSender);
  });

  it("picks up PhilSMS when it is the only carrier configured", () => {
    expect(getSmsSender({ PHILSMS_API_TOKEN: "tok" })).toBeInstanceOf(
      PhilSmsSender,
    );
  });

  it("prefers Twilio when both are configured, so existing deploys don't move", () => {
    expect(
      getSmsSender({ ...TWILIO, PHILSMS_API_TOKEN: "tok" }),
    ).toBeInstanceOf(TwilioSmsSender);
  });
});

describe("getSmsSender explicit SMS_PROVIDER", () => {
  afterEach(() => vi.restoreAllMocks());

  it("honours philsms even when Twilio is also configured", () => {
    expect(
      getSmsSender({
        ...TWILIO,
        SMS_PROVIDER: "philsms",
        PHILSMS_API_TOKEN: "tok",
      }),
    ).toBeInstanceOf(PhilSmsSender);
  });

  it("honours twilio even when PhilSMS is also configured", () => {
    expect(
      getSmsSender({
        ...TWILIO,
        SMS_PROVIDER: "twilio",
        PHILSMS_API_TOKEN: "tok",
      }),
    ).toBeInstanceOf(TwilioSmsSender);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(
      getSmsSender({ SMS_PROVIDER: "  PhilSMS ", PHILSMS_API_TOKEN: "tok" }),
    ).toBeInstanceOf(PhilSmsSender);
  });

  it("does NOT silently fall through to another configured carrier", () => {
    // Naming philsms without a token must not quietly send via Twilio — the
    // texts would go out under the wrong account with no indication why.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const sender = getSmsSender({ ...TWILIO, SMS_PROVIDER: "philsms" });
    expect(sender).not.toBeInstanceOf(TwilioSmsSender);
    expect(sender).not.toBeInstanceOf(PhilSmsSender);
    expect(error).toHaveBeenCalled();
  });

  it("stubs and complains for a provider this build cannot speak", () => {
    // semaphore is documented in .env.example but not implemented.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const sender = getSmsSender({ ...TWILIO, SMS_PROVIDER: "semaphore" });
    expect(sender).not.toBeInstanceOf(TwilioSmsSender);
    expect(error).toHaveBeenCalled();
  });
});
