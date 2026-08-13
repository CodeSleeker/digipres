import { describe, it, expect, vi } from "vitest";
import { AnalyticsService } from "@/services/analytics-service";
import { AppointmentService } from "@/services/appointment-service";
import { DashboardService } from "@/services/dashboard-service";
import { DomainService } from "@/services/domain-service";
import { ReviewAutomationService } from "@/services/review-automation-service";
import { WebsiteContentService } from "@/services/website-content-service";
import { BusinessError } from "@/services/business-service";
import type { AnalyticsRepository } from "@/repositories/analytics-repository";
import type { AppointmentRepository } from "@/repositories/appointment-repository";
import type { DashboardRepository } from "@/repositories/dashboard-repository";
import type { DomainRepository } from "@/repositories/domain-repository";
import type { BusinessRepository } from "@/repositories/business-repository";
import type { ReviewMessageRepository } from "@/repositories/review-message-repository";
import type { CustomerRepository } from "@/repositories/customer-repository";
import type { DomainProvider } from "@/lib/domains/provider";
import type { DomainAdminPort } from "@/services/domain-service";
import type { SmsSender } from "@/lib/sms/sender";

/**
 * Business scoping for the remaining services (CustomerService is covered in
 * tests/rls-isolation.test.ts).
 *
 * This matters more since impersonation shipped. Staff acting as a tenant get
 * the SERVICE-ROLE client, which bypasses RLS entirely — so for those requests
 * the businessId the service was handed is the ONLY thing keeping one client's
 * data out of another's. These tests assert each service passes that id through
 * to every repository call and never widens it.
 */

const A = "biz-A";
const B = "biz-B";

/** The recorded calls of a mock, without pinning its argument tuple type. */
const callsOf = (mock: unknown): unknown[][] =>
  (mock as { mock: { calls: unknown[][] } }).mock.calls;

/** Every argument every mock was called with, flattened. */
const allArgs = (mocks: unknown[]) => mocks.flatMap((m) => callsOf(m).flat());

describe("analytics service", () => {
  it("scopes every underlying query to the given business", async () => {
    const repo = {
      appointmentsSince: vi.fn(async () => []),
      customerCreatedDatesSince: vi.fn(async () => []),
      customerReviewStatuses: vi.fn(async () => []),
      reviewMessageStatuses: vi.fn(async () => []),
    };
    await new AnalyticsService(
      repo as unknown as AnalyticsRepository,
    ).getAnalytics(A);

    for (const mock of Object.values(repo)) {
      expect(mock).toHaveBeenCalled();
      expect(callsOf(mock)[0][0]).toBe(A);
    }
    expect(allArgs(Object.values(repo))).not.toContain(B);
  });
});

describe("dashboard service", () => {
  it("scopes every stat to the given business", async () => {
    const repo = {
      countAppointmentsBetween: vi.fn(async () => 0),
      countCustomers: vi.fn(async () => 0),
      countCustomersByReviewStatus: vi.fn(async () => 0),
      countMessagesSent: vi.fn(async () => 0),
      countMessagesQueued: vi.fn(async () => 0),
      recentCustomers: vi.fn(async () => []),
    };
    await new DashboardService(repo as unknown as DashboardRepository).getStats(
      A,
      "2026-01-01T00:00:00Z",
      "2026-01-01T23:59:59Z",
    );

    for (const mock of Object.values(repo)) {
      expect(callsOf(mock)[0][0]).toBe(A);
    }
    expect(allArgs(Object.values(repo))).not.toContain(B);
  });
});

describe("appointment service", () => {
  const appointment = {
    id: "appt-1",
    status: "scheduled" as const,
    customerId: "cust-1",
  };

  function make(overrides: Record<string, unknown> = {}) {
    const repo = {
      list: vi.fn(async () => ({
        rows: [],
        total: 0,
        page: 1,
        pageSize: 20,
        pageCount: 1,
      })),
      listBetween: vi.fn(async () => []),
      findById: vi.fn(async () => appointment),
      insert: vi.fn(async () => appointment),
      update: vi.fn(async () => appointment),
      softDelete: vi.fn(async () => undefined),
      ...overrides,
    };
    const reviews = { startForAppointment: vi.fn(async () => undefined) };
    const service = new AppointmentService(
      repo as unknown as AppointmentRepository,
      reviews as unknown as ReviewAutomationService,
    );
    return { service, repo, reviews };
  }

  it("passes the given business to every read and write", async () => {
    const { service, repo } = make();

    await service.list(A, { page: 1, pageSize: 20 });
    await service.listBetween(A, "2026-01-01", "2026-01-31");
    await service.get(A, "appt-1");
    await service.update(A, "appt-1", { service: "Fade" });
    await service.softDelete(A, "appt-1");

    for (const mock of Object.values(repo)) {
      for (const call of callsOf(mock)) expect(call[0]).toBe(A);
    }
  });

  it("refuses to update an appointment belonging to another business", async () => {
    // findById is business-scoped, so the other tenant's row reads as absent.
    const { service, repo } = make({ findById: vi.fn(async () => null) });

    await expect(
      service.update(A, "appt-of-biz-B", { service: "hijack" }),
    ).rejects.toBeInstanceOf(BusinessError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("queues the review campaign against the SAME business as the appointment", async () => {
    const { service, reviews } = make({
      insert: vi.fn(async () => ({ ...appointment, status: "completed" })),
    });

    await service.create(A, {
      customerId: "cust-1",
      startsAt: "2026-01-01T10:00:00Z",
    } as never);

    // A campaign attributed to the wrong tenant would text the wrong customers.
    expect(reviews.startForAppointment).toHaveBeenCalledWith(
      A,
      expect.objectContaining({ id: "appt-1" }),
    );
  });
});

describe("domain service", () => {
  const domain = { id: "dom-1", hostname: "roniesbarber.com" };

  function make(overrides: Record<string, unknown> = {}) {
    const repo = {
      listForBusiness: vi.fn(async () => []),
      findById: vi.fn(async () => domain),
      insert: vi.fn(async () => domain),
      setPrimary: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      ...overrides,
    };
    const provider = {
      add: vi.fn(async () => ({ ok: true, instructions: [] })),
      verify: vi.fn(async () => ({ verified: true, instructions: [] })),
      remove: vi.fn(async () => ({ ok: true })),
    };
    const admin = {
      markVerified: vi.fn(async () => undefined),
      publishRouting: vi.fn(async () => ({ ok: true }) as const),
    };
    const service = new DomainService(
      repo as unknown as DomainRepository,
      provider as unknown as DomainProvider,
      admin as unknown as DomainAdminPort,
    );
    return { service, repo, provider, admin };
  }

  it("passes the given business to every repository call", async () => {
    const { service, repo } = make();

    await service.list(A);
    await service.add(A, "roniesbarber.com");
    await service.verify(A, "dom-1");
    await service.setPrimary(A, "dom-1");
    await service.remove(A, "dom-1");

    for (const mock of Object.values(repo)) {
      for (const call of callsOf(mock)) expect(call[0]).toBe(A);
    }
  });

  it.each(["verify", "setPrimary", "remove"] as const)(
    "refuses to %s another business's domain",
    async (method) => {
      const { service, repo, admin } = make({
        findById: vi.fn(async () => null),
      });

      await expect(service[method](A, "dom-of-biz-B")).rejects.toBeInstanceOf(
        BusinessError,
      );
      expect(repo.setPrimary).not.toHaveBeenCalled();
      expect(repo.remove).not.toHaveBeenCalled();
      // Never flips `verified` on a row this tenant doesn't own.
      expect(admin.markVerified).not.toHaveBeenCalled();
    },
  );
});

describe("website content service", () => {
  it("writes the section to the given business only", async () => {
    const repo = { updateContent: vi.fn(async () => ({}) as never) };
    await new WebsiteContentService(
      repo as unknown as BusinessRepository,
    ).updateSection(A, "hero", { headline: "Hi" });

    expect(repo.updateContent).toHaveBeenCalledWith(A, "hero", {
      headline: "Hi",
    });
  });
});

describe("review automation service", () => {
  function make(overrides: Record<string, unknown> = {}) {
    const messages = {
      existsForAppointment: vi.fn(async () => false),
      insertMany: vi.fn(async () => undefined),
      claimDue: vi.fn(async () => []),
      cancelPending: vi.fn(async () => 0),
      ...overrides,
    };
    const customers = { findById: vi.fn(async () => null) };
    const businesses = { findById: vi.fn(async () => null) };
    const sender = { send: vi.fn(async () => ({ success: true })) };
    const service = new ReviewAutomationService(
      messages as unknown as ReviewMessageRepository,
      customers as unknown as CustomerRepository,
      businesses as unknown as BusinessRepository,
      sender as unknown as SmsSender,
    );
    return { service, messages, customers, businesses };
  }

  it("looks up the business AND the customer under the same tenant", async () => {
    const { service, customers, businesses } = make();

    await service.startForAppointment(A, {
      id: "appt-1",
      customerId: "cust-1",
    } as never);

    expect(businesses.findById).toHaveBeenCalledWith(A);
    expect(customers.findById).toHaveBeenCalledWith(A, "cust-1");
  });

  it("cancels only the given tenant's pending messages", async () => {
    const { service, messages } = make();
    await service.cancelForCustomer(A, "cust-1");
    expect(messages.cancelPending).toHaveBeenCalledWith(A, "cust-1");
  });

  it("claims only the given tenant's due messages when scoped", async () => {
    // Under impersonation the client bypasses RLS, so an unscoped claim would
    // pick up — and SEND — every other tenant's queued messages.
    const { service, messages } = make();
    await service.processDue("2026-01-01T00:00:00Z", 100, A);
    expect(messages.claimDue).toHaveBeenCalledWith(
      "2026-01-01T00:00:00Z",
      100,
      A,
    );
  });

  it("claims across all tenants only when explicitly unscoped (the cron)", async () => {
    const { service, messages } = make();
    await service.processDue("2026-01-01T00:00:00Z", 100);
    expect(messages.claimDue).toHaveBeenCalledWith(
      "2026-01-01T00:00:00Z",
      100,
      null,
    );
  });
});
