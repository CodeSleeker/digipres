import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validate Twilio's `X-Twilio-Signature` for a form-encoded webhook request.
 *
 * Twilio computes: base64( HMAC-SHA1( authToken, fullUrl + concat(sorted POST
 * params as key+value) ) ). We recompute and compare in constant time. This is
 * what proves an inbound "STOP"/"START" webhook really came from Twilio and not
 * a forged request trying to opt numbers in/out.
 */
export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null | undefined,
): boolean {
  if (!signature) return false;

  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");

  const expected = createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
