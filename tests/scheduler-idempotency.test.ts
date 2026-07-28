import { describe, it, expect, vi } from "vitest";
import { ReviewAutomationService } from "@/services/review-automation-service";
import type { ReviewMessageRepository } from "@/repositories/review-message-repository";
import type { CustomerRepository } from "@/repositories/customer-repository";
import type { BusinessRepository } from "@/repositories/business-repository";
import type { SmsSender } from "@/lib/sms/sender";
import type { ReviewMessage } from "@/types/review-message";

/**
 * Scheduler idempotency / no-double-send tests for the Blocker 2 fix.
 *
 * The DB provides the atomicity (claim_due_review_messages + FOR UPDATE SKIP
 * LOCKED, migration 0008); here the fake queue models that guarantee — claimDue
 * returns each row at most once — and we verify the service consumes claimed
 * rows without ever re-sending.
 */

function makeMessage(over: Partial<ReviewMessage> = {}): ReviewMessage {
  return {
    id: "m1",
    businessId: "biz",
    customerId: "cust",
    appointmentId: null,
    step: "thank_you",
    status: "queued",
    body: "Hi there",
    toMobile: "+10000000000",
    customerName: "Cust",
    scheduledAt: "2026-01-01T00:00:00.000Z",
    sentAt: null,
    deliveredAt: null,
    attempts: 0,
    lastError: null,
    providerMessageId: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

/** Fake queue: claimDue pops rows (atomic-claim model) so each is served once. */
function makeQueue(initial: ReviewMessage[]) {
  const queue = [...initial];
  return {
    claimDue: vi.fn(async (_now: string, limit: number) =>
      queue.splice(0, limit),
    ),
    markSent: vi.fn(async () => {}),
    reschedule: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
  };
}

function makeSender(result: {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}) {
  return { send: vi.fn(async () => result) };
}

const unusedCustomers = {} as unknown as CustomerRepository;
const unusedBusinesses = {} as unknown as BusinessRepository;

function makeService(
  messages: ReturnType<typeof makeQueue>,
  sender: ReturnType<typeof makeSender>,
) {
  return new ReviewAutomationService(
    messages as unknown as ReviewMessageRepository,
    unusedCustomers,
    unusedBusinesses,
    sender as unknown as SmsSender,
  );
}

const NOW = "2026-02-01T00:00:00.000Z";

describe("review automation — idempotency & no double-send", () => {
  it("does not re-send a row that already has a provider_message_id", async () => {
    const messages = makeQueue([makeMessage({ providerMessageId: "prov-1" })]);
    const sender = makeSender({ success: true, providerMessageId: "x" });
    const service = makeService(messages, sender);

    const result = await service.processDue(NOW);

    expect(sender.send).not.toHaveBeenCalled(); // already sent → not re-sent
    expect(messages.markSent).toHaveBeenCalledWith("m1", 0, "prov-1");
    expect(result.sent).toBe(1);
  });

  it("sends an unsent message exactly once and marks it sent", async () => {
    const messages = makeQueue([makeMessage()]);
    const sender = makeSender({ success: true, providerMessageId: "prov-9" });
    const service = makeService(messages, sender);

    const result = await service.processDue(NOW);

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(messages.markSent).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });

  it("never double-sends when two processors run concurrently", async () => {
    // One due message, shared queue. Atomic claim means only one run gets it.
    const messages = makeQueue([makeMessage()]);
    const sender = makeSender({ success: true, providerMessageId: "prov-1" });
    const service = makeService(messages, sender);

    await Promise.all([service.processDue(NOW), service.processDue(NOW)]);

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(messages.markSent).toHaveBeenCalledTimes(1);
  });

  it("reschedules (stays queued) on a retryable failure", async () => {
    const messages = makeQueue([makeMessage({ attempts: 0 })]);
    const sender = makeSender({ success: false, error: "carrier down" });
    const service = makeService(messages, sender);

    const result = await service.processDue(NOW);

    expect(messages.reschedule).toHaveBeenCalledTimes(1);
    expect(messages.markFailed).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it("marks failed after exhausting attempts", async () => {
    const messages = makeQueue([makeMessage({ attempts: 2 })]); // +1 = 3 = max
    const sender = makeSender({ success: false, error: "carrier down" });
    const service = makeService(messages, sender);

    await service.processDue(NOW);

    expect(messages.markFailed).toHaveBeenCalledTimes(1);
    expect(messages.reschedule).not.toHaveBeenCalled();
  });
});
