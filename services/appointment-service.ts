import type { AppointmentRepository } from "@/repositories/appointment-repository";
import type { ReviewAutomationService } from "./review-automation-service";
import type {
  Appointment,
  AppointmentListQuery,
  AppointmentListResult,
} from "@/types/appointment";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@/schemas/appointment";
import { BusinessError } from "./business-service";

/**
 * Appointment rules, scoped to ONE business (the caller supplies the id).
 *
 * Owns the key behavior: when an appointment transitions INTO 'completed' — on
 * create or update — it triggers the review automation workflow exactly once.
 */
export class AppointmentService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly reviewAutomation: ReviewAutomationService,
  ) {}

  list(
    businessId: string,
    query: AppointmentListQuery,
  ): Promise<AppointmentListResult> {
    return this.appointments.list(businessId, query);
  }

  listBetween(
    businessId: string,
    startInclusive: string,
    endInclusive: string,
  ): Promise<Appointment[]> {
    return this.appointments.listBetween(
      businessId,
      startInclusive,
      endInclusive,
    );
  }

  get(businessId: string, id: string): Promise<Appointment | null> {
    return this.appointments.findById(businessId, id);
  }

  async create(
    businessId: string,
    input: CreateAppointmentInput,
  ): Promise<Appointment> {
    const created = await this.appointments.insert(businessId, input);
    if (created.status === "completed") {
      await this.reviewAutomation.startForAppointment(businessId, created);
    }
    return created;
  }

  async update(
    businessId: string,
    id: string,
    input: UpdateAppointmentInput,
  ): Promise<Appointment> {
    const existing = await this.appointments.findById(businessId, id);
    if (!existing) throw new BusinessError("NOT_FOUND");

    const updated = await this.appointments.update(businessId, id, input);

    const becameCompleted =
      existing.status !== "completed" && updated.status === "completed";
    if (becameCompleted) {
      await this.reviewAutomation.startForAppointment(businessId, updated);
    }
    return updated;
  }

  async softDelete(businessId: string, id: string): Promise<void> {
    await this.appointments.softDelete(businessId, id);
  }
}
