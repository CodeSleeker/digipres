import { describe, it, expect, vi } from "vitest";
import { ReviewAutomationService } from "@/services/review-automation-service";
import type { ReviewMessageRepository } from "@/repositories/review-message-repository";
import type { CustomerRepository } from "@/repositories/customer-repository";
import type { BusinessRepository } from "@/repositories/business-repository";
import type { SmsSender } from "@/lib/sms/sender";
import type { ReviewMessage, ReviewMessageStep } from "@/types/review-message";
import type { CustomerReviewStatusEnum } from "@/types/database";

/**
 * WHEN a customer counts as "asked for a review".
 *
 * This used to flip at QUEUE time, inside startForAppointment. At that instant
 * the only message sent is the thank-you, which asks for nothing — the review
 * request is three days out and may never send at all. The dashboard therefore
 * reported "awaiting a response" for people nobody had asked, and the review
 * rate divided by them, permanently understating conversion.
 *
 * It now flips when the review_request message is actually sent.
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
    toMobile: "+639170000000",
    customerName: "Hally",
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

function makeCustomers(reviewStatus: CustomerReviewStatusEnum) {
  return {
    findById: vi.fn(async () => ({ id: "cust", reviewStatus })),
    update: vi.fn(async () => {}),
  };
}

const businesses = {
  findById: vi.fn(async () => ({ name: "Ronnie Barbershop", smsSenderId: "Ronnie" })),
};

function makeService(
  messages: ReturnType<typeof makeQueue>,
  customers: ReturnType<typeof makeCustomers>,
  ok = true,
) {
  return new ReviewAutomationService(
    messages as unknown as ReviewMessageRepository,
    customers as unknown as CustomerRepository,
    businesses as unknown as BusinessRepository,
    {
      send: vi.fn(async () => ({ success: ok, providerMessageId: "p1" })),
    } as unknown as SmsSender,
  );
}

const NOW = "2026-02-01T00:00:00.000Z";
const run = async (step: ReviewMessageStep, status: CustomerReviewStatusEnum, ok = true) => {
  const customers = makeCustomers(status);
  const messages = makeQueue([makeMessage({ step })]);
  const result = await makeService(messages, customers, ok).processDue(NOW);
  return { customers, messages, result };
};

describe("reviewStatus transitions on send", () => {
  it("does NOT mark requested when only the thank-you goes out", async () => {
    // The exact case on the dashboard today: thank-you sent, request queued
    // for three days' time, customer badged as already asked.
    const { customers, result } = await run("thank_you", "pending");
    expect(result.sent).toBe(1);
    expect(customers.update).not.toHaveBeenCalled();
  });

  it("does NOT mark requested for the reminder either", async () => {
    const { customers } = await run("reminder", "pending");
    expect(customers.update).not.toHaveBeenCalled();
  });

  it("marks requested when the review request itself is sent", async () => {
    const { customers } = await run("review_request", "pending");
    expect(customers.update).toHaveBeenCalledWith("biz", "cust", {
      reviewStatus: "requested",
    });
  });

  it("does not mark requested when the send failed", async () => {
    // Nothing reached the customer, so nothing was asked.
    const { customers, result } = await run("review_request", "pending", false);
    expect(result.sent).toBe(0);
    expect(customers.update).not.toHaveBeenCalled();
  });

  it("never walks a customer back from received", async () => {
    // Someone who reviewed after the thank-you but before the request would
    // otherwise be demoted by a message that is about to be cancelled anyway.
    const { customers } = await run("review_request", "received");
    expect(customers.update).not.toHaveBeenCalled();
  });

  it("does not re-mark a customer already in requested", async () => {
    const { customers } = await run("review_request", "requested");
    expect(customers.update).not.toHaveBeenCalled();
  });

  it("still marks requested on the idempotent replay path", async () => {
    // A row that already has a provider id is finalised without re-sending;
    // the status must still catch up, or a crash mid-run loses it forever.
    const customers = makeCustomers("pending");
    const messages = makeQueue([
      makeMessage({ step: "review_request", providerMessageId: "prov-1" }),
    ]);
    const service = makeService(messages, customers);

    const result = await service.processDue(NOW);

    expect(result.sent).toBe(1);
    expect(messages.markSent).toHaveBeenCalledWith("m1", 0, "prov-1");
    expect(customers.update).toHaveBeenCalledWith("biz", "cust", {
      reviewStatus: "requested",
    });
  });

  it("does not fail the batch when the status update throws", async () => {
    // The message is already marked sent by this point. Throwing here would
    // fail the run over a label and risk the row being sent again next pass.
    const customers = {
      findById: vi.fn(async () => {
        throw new Error("db down");
      }),
      update: vi.fn(async () => {}),
    };
    const messages = makeQueue([makeMessage({ step: "review_request" })]);
    const service = makeService(
      messages,
      customers as unknown as ReturnType<typeof makeCustomers>,
    );

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await service.processDue(NOW);

    expect(result.sent).toBe(1);
    expect(messages.markSent).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
