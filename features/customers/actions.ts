"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { CustomerRepository } from "@/repositories/customer-repository";
import { CustomerService } from "@/services/customer-service";
import { BusinessError } from "@/services/business-service";
import { makeReviewAutomationService } from "@/features/reviews/service";
import { createCustomerSchema, updateCustomerSchema } from "@/schemas/customer";

export type CustomerFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  id?: string;
};

function makeService(supabase: SupabaseClient<Database>): CustomerService {
  return new CustomerService(new CustomerRepository(supabase));
}

const NO_BUSINESS: CustomerFormState = {
  error: "Create your business profile before managing customers.",
};

function parseContent(formData: FormData): unknown {
  const raw = formData.get("content");
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fieldErrorsOf(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages && messages.length) out[key] = messages;
  }
  return out;
}

export async function createCustomer(
  formData: FormData,
): Promise<CustomerFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const parsed = createCustomerSchema.safeParse(parseContent(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    const customer = await makeService(supabase).create(
      businessId,
      parsed.data,
    );
    await auditTenantAction(context, "customer.created", {
      entity: "customer",
      entityId: customer.id,
    });
    revalidatePath("/admin/customers");
    return { success: true, id: customer.id };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

export async function updateCustomer(
  formData: FormData,
): Promise<CustomerFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing customer id." };

  const parsed = updateCustomerSchema.safeParse(parseContent(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await makeService(supabase).update(businessId, id, parsed.data);
    await auditTenantAction(context, "customer.updated", {
      entity: "customer",
      entityId: id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    // If the customer has now reviewed, cancel any remaining queued messages.
    if (parsed.data.reviewStatus === "received") {
      await makeReviewAutomationService(supabase).cancelForCustomer(
        businessId,
        id,
      );
      revalidatePath("/admin/reviews");
    }

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}/edit`);
    return { success: true, id };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

export async function deleteCustomer(
  formData: FormData,
): Promise<CustomerFormState> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;
  if (!businessId) return NO_BUSINESS;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing customer id." };

  try {
    await makeService(supabase).softDelete(businessId, id);
    await auditTenantAction(context, "customer.deleted", {
      entity: "customer",
      entityId: id,
    });
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

function toMessage(error: unknown): string {
  if (error instanceof BusinessError && error.code === "NOT_FOUND") {
    return "Create your business profile before managing customers.";
  }
  console.error("[customers]", error);
  return "Something went wrong. Please try again.";
}
