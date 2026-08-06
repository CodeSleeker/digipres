import { describe, it, expect, vi, beforeEach } from "vitest";
import { canSend } from "@/services/subscriber-service";
import { DigestService } from "@/services/digest-service";
import { digestSubject, digestText } from "@/services/digest-service";
import { resolveFrom } from "@/lib/email/sender";
import { subscribeSchema } from "@/schemas/subscriber";
import type { Business } from "@/types/business-entity";
import type { Creation } from "@/types/subscriber";

/**
 * The mailing list.
 *
 * Two things here are load-bearing and quiet when wrong: WHO may be sent to,
 * and WHICH creations a given week's digest covers. A mistake in the first
 * sends mail from a domain that is not authorised for it; a mistake in the
 * second mails the same people the same news twice, which is the fastest way
 * for a list to be reported.
 */

const business = (over: Partial<Business> = {}): Business =>
  ({
    id: "b1",
    name: "Desserts by Arah",
    slug: "arah",
    status: "active",
    newsletterFromEmail: "news@arah.ph",
    newsletterFromName: "Desserts by Arah",
    newsletterVerified: true,
    ...over,
  }) as Business;

const creation = (over: Partial<Creation> = {}): Creation =>
  ({
    id: "c1",
    businessId: "b1",
    name: "Pistachio Rose Cake",
    description: "Almond and pistachio sponge.",
    imageUrl: null,
    price: "₱2,450",
    publishedAt: "2026-08-05T00:00:00.000Z",
    createdAt: "2026-08-05T00:00:00.000Z",
    ...over,
  }) as Creation;

describe("canSend", () => {
  it("requires an active business, a sender and verification", () => {
    expect(canSend(business())).toBe(true);
    // Each condition alone is enough to refuse.
    expect(canSend(business({ newsletterVerified: false }))).toBe(false);
    expect(canSend(business({ newsletterFromEmail: null }))).toBe(false);
    expect(canSend(business({ status: "suspended" }))).toBe(false);
    expect(canSend(business({ status: "draft" }))).toBe(false);
  });
});

describe("subscribe schema", () => {
  it("normalises the address so one person is one row", () => {
    const parsed = subscribeSchema.parse({ email: "  Arah@Example.COM " });
    expect(parsed.email).toBe("arah@example.com");
  });

  it("refuses something that is not an address", () => {
    expect(subscribeSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });
});

describe("sender resolution", () => {
  const platform = "Aliamz Digital <bookings@aliamz.com>";

  it("sends from the tenant's own address when given one", () => {
    // The whole point of the model: a newsletter complaint lands on the
    // sender's domain, never on the address carrying booking confirmations.
    expect(
      resolveFrom(platform, {
        fromAddress: "news@arah.ph",
        fromName: "Desserts by Arah",
      }),
    ).toBe(`"Desserts by Arah" <news@arah.ph>`);
  });

  it("falls back to the platform address for anything unusable", () => {
    // Header injection through the override must not be possible.
    for (const bad of [
      "news@arah.ph, victim@example.com",
      "Evil <news@arah.ph>",
      "news@arah.ph\nBcc: victim@example.com",
      "",
    ]) {
      expect(resolveFrom(platform, { fromAddress: bad })).toBe(platform);
    }
  });
});

describe("digest content", () => {
  it("names the item when there is one, counts them when there are more", () => {
    expect(digestSubject("Arah", [creation()])).toBe(
      "Pistachio Rose Cake — new from Arah",
    );
    expect(digestSubject("Arah", [creation(), creation({ id: "c2" })])).toBe(
      "2 new things from Arah",
    );
  });

  it("always carries a way out in the body", () => {
    // The header button only exists in some clients. A reader who cannot find
    // the way out uses the spam button instead, which costs far more.
    const body = digestText("Arah", [creation()], "https://x.test/unsub?token=t");
    expect(body).toContain("https://x.test/unsub?token=t");
    expect(body.toLowerCase()).toContain("to stop");
  });
});

/** A fake repo layer, so the windowing logic can be tested on its own. */
function harness(options: {
  creations: Creation[];
  lastCoveredTo?: string;
  recipients?: { id: string; email: string; unsubscribeToken: string }[];
}) {
  const sent: { to: string; subject: string }[] = [];
  const recorded: { coveredFrom: string; coveredTo: string }[] = [];

  const service = new DigestService(
    {
      from: () => ({}),
    } as never,
    { send: async (m) => (sent.push({ to: m.to, subject: m.subject }), { success: true }) },
  );

  // Replace the repositories the constructor built.
  Object.assign(service, {
    businesses: { listNewsletterSenders: async () => [business()] },
    creations: { publishedBetween: async () => options.creations },
    subscribers: {
      sendable: async () =>
        options.recipients ?? [
          { id: "s1", email: "reader@example.com", unsubscribeToken: "tok" },
        ],
    },
    digests: {
      latest: async () =>
        options.lastCoveredTo
          ? { coveredTo: options.lastCoveredTo }
          : null,
      record: async (r: { coveredFrom: string; coveredTo: string }) => {
        recorded.push(r);
      },
    },
  });

  return { service, sent, recorded };
}

describe("digest run", () => {
  const now = new Date("2026-08-09T00:00:00.000Z");

  beforeEach(() => vi.restoreAllMocks());

  it("sends when there is something new", async () => {
    const { service, sent, recorded } = harness({ creations: [creation()] });
    const result = await service.run({ now });

    expect(sent).toHaveLength(1);
    expect(result.emailsSent).toBe(1);
    expect(recorded).toHaveLength(1);
  });

  /**
   * The rule the owner asked for, and the one that keeps a list worth reading:
   * a week with nothing new produces no email AND no record — so the window
   * stays open rather than being consumed by a send that never happened.
   */
  it("sends nothing, and records nothing, when there is no new work", async () => {
    const { service, sent, recorded } = harness({ creations: [] });
    const result = await service.run({ now });

    expect(sent).toEqual([]);
    expect(recorded).toEqual([]);
    expect(result.businessesSent).toBe(0);
  });

  it("starts the window where the last digest ended", async () => {
    const { service, recorded } = harness({
      creations: [creation()],
      lastCoveredTo: "2026-08-02T00:00:00.000Z",
    });
    await service.run({ now });

    expect(recorded[0]!.coveredFrom).toBe("2026-08-02T00:00:00.000Z");
    expect(recorded[0]!.coveredTo).toBe(now.toISOString());
  });

  it("gives a first-time sender one week, not their whole history", async () => {
    const { service, recorded } = harness({ creations: [creation()] });
    await service.run({ now });

    const from = new Date(recorded[0]!.coveredFrom);
    expect(now.getTime() - from.getTime()).toBe(7 * 86_400_000);
  });

  it("refuses to re-send a window already covered", async () => {
    // A double-scheduled run, or a manual trigger straight after the cron.
    const { service, sent, recorded } = harness({
      creations: [creation()],
      lastCoveredTo: now.toISOString(),
    });
    await service.run({ now });

    expect(sent).toEqual([]);
    expect(recorded).toEqual([]);
  });

  it("does not send to a list with nobody on it", async () => {
    const { service, sent, recorded } = harness({
      creations: [creation()],
      recipients: [],
    });
    await service.run({ now });

    expect(sent).toEqual([]);
    // No record either: nothing was covered, so the window must stay open.
    expect(recorded).toEqual([]);
  });
});
