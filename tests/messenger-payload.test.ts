import { describe, expect, it } from "vitest";
import { inboundEventsFrom } from "@/lib/messenger/payload";
import type { MessengerWebhookBody } from "@/types/messenger";

function body(...messaging: unknown[]): MessengerWebhookBody {
  return {
    object: "page",
    entry: [{ id: "PAGE_1", messaging: messaging as never }],
  };
}

describe("inboundEventsFrom", () => {
  it("flattens a plain text message", () => {
    const events = inboundEventsFrom(
      body({
        sender: { id: "PSID_1" },
        recipient: { id: "PAGE_1" },
        timestamp: 1_700_000_000_000,
        message: { mid: "m_1", text: "do you have rooms in May?" },
      }),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      pageId: "PAGE_1",
      psid: "PSID_1",
      mid: "m_1",
      text: "do you have rooms in May?",
      sentAt: new Date(1_700_000_000_000).toISOString(),
    });
  });

  it("reads several entries and several events per entry", () => {
    const events = inboundEventsFrom({
      object: "page",
      entry: [
        {
          id: "PAGE_1",
          messaging: [
            { sender: { id: "A" }, message: { mid: "m_1", text: "hi" } },
            { sender: { id: "B" }, message: { mid: "m_2", text: "hello" } },
          ],
        },
        {
          id: "PAGE_2",
          messaging: [
            { sender: { id: "C" }, message: { mid: "m_3", text: "hey" } },
          ],
        },
      ],
    });

    expect(events.map((e) => [e.pageId, e.psid, e.mid])).toEqual([
      ["PAGE_1", "A", "m_1"],
      ["PAGE_1", "B", "m_2"],
      ["PAGE_2", "C", "m_3"],
    ]);
  });

  /**
   * The Page's own outbound messages come back when `message_echoes` is
   * subscribed. Storing them as inbound would have the bot answering itself.
   */
  it("skips echoes of the Page's own messages", () => {
    const events = inboundEventsFrom(
      body({
        sender: { id: "PAGE_1" },
        message: { mid: "m_1", text: "our rates start at…", is_echo: true },
      }),
    );
    expect(events).toEqual([]);
  });

  it("takes a postback's title as the text", () => {
    const events = inboundEventsFrom(
      body({
        sender: { id: "PSID_1" },
        timestamp: 1_700_000_000_000,
        postback: { title: "Book a stay", payload: "BOOK" },
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.text).toBe("Book a stay");
    expect(events[0]!.mid).toBeNull();
  });

  it("skips events that are neither a message nor a postback", () => {
    const events = inboundEventsFrom(
      body(
        { sender: { id: "PSID_1" }, read: { watermark: 1 } },
        { sender: { id: "PSID_1" }, delivery: { watermark: 1 } },
      ),
    );
    expect(events).toEqual([]);
  });

  it("skips events with no sender", () => {
    const events = inboundEventsFrom(
      body({ message: { mid: "m_1", text: "orphan" } }),
    );
    expect(events).toEqual([]);
  });

  it("skips entries with no page id", () => {
    const events = inboundEventsFrom({
      object: "page",
      entry: [
        {
          messaging: [
            { sender: { id: "PSID_1" }, message: { mid: "m", text: "x" } },
          ],
        },
      ],
    });
    expect(events).toEqual([]);
  });

  it("keeps a message with no text (an attachment only)", () => {
    const events = inboundEventsFrom(
      body({
        sender: { id: "PSID_1" },
        message: { mid: "m_1", attachments: [{ type: "image" }] },
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.text).toBeNull();
    expect(events[0]!.payload).toMatchObject({ message: { mid: "m_1" } });
  });

  /**
   * The fallback matters: this value gates whether a reply is allowed inside
   * Meta's 24-hour window, so an epoch date would mark every thread expired.
   */
  it("falls back to now when the timestamp is missing or unusable", () => {
    const before = Date.now();
    const events = inboundEventsFrom(
      body(
        { sender: { id: "A" }, message: { mid: "m_1", text: "x" } },
        {
          sender: { id: "B" },
          timestamp: Number.NaN,
          message: { mid: "m_2", text: "y" },
        },
      ),
    );

    expect(events).toHaveLength(2);
    for (const event of events) {
      const at = new Date(event.sentAt).getTime();
      expect(at).toBeGreaterThanOrEqual(before);
      expect(at).toBeLessThanOrEqual(Date.now());
    }
  });

  it("returns nothing for an empty delivery", () => {
    expect(inboundEventsFrom({})).toEqual([]);
    expect(inboundEventsFrom({ object: "page", entry: [] })).toEqual([]);
  });
});
