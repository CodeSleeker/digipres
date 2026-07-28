import { describe, it, expect, afterEach, vi } from "vitest";
import { getSmsSender } from "@/lib/sms/sender";
import { TwilioSmsSender } from "@/lib/sms/twilio-sender";

/**
 * Provider selection: real Twilio sender when configured, no-op stub otherwise.
 * (The send() HTTP call itself isn't exercised here — no live carrier in CI.)
 */
describe("getSmsSender provider selection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("falls back to the stub when Twilio env is absent", () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "");
    vi.stubEnv("TWILIO_FROM_NUMBER", "");
    expect(getSmsSender()).not.toBeInstanceOf(TwilioSmsSender);
  });

  it("uses Twilio when credentials + a messaging service are set", () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token_test");
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "MG_test");
    expect(getSmsSender()).toBeInstanceOf(TwilioSmsSender);
  });

  it("uses Twilio with a From number instead of a messaging service", () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token_test");
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+15551234567");
    expect(getSmsSender()).toBeInstanceOf(TwilioSmsSender);
  });

  it("stays on the stub when credentials exist but no sender is configured", () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token_test");
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "");
    vi.stubEnv("TWILIO_FROM_NUMBER", "");
    expect(getSmsSender()).not.toBeInstanceOf(TwilioSmsSender);
  });
});
