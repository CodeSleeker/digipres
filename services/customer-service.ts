import type { CustomerRepository } from "@/repositories/customer-repository";
import type {
  Customer,
  CustomerListQuery,
  CustomerListResult,
} from "@/types/customer";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/schemas/customer";
import { BusinessError } from "./business-service";

/**
 * Customer CRM rules, scoped to ONE business.
 *
 * The caller decides which tenant is being acted on (lib/tenant/business-context)
 * and passes its id; this service never widens that scope. Every repository call
 * is business-scoped, so another tenant's record simply reads as absent — which
 * is what makes a cross-tenant mutation impossible here as well as at the
 * database.
 */
export class CustomerService {
  constructor(private readonly customers: CustomerRepository) {}

  list(
    businessId: string,
    query: CustomerListQuery,
  ): Promise<CustomerListResult> {
    return this.customers.list(businessId, query);
  }

  get(businessId: string, id: string): Promise<Customer | null> {
    return this.customers.findById(businessId, id);
  }

  create(businessId: string, input: CreateCustomerInput): Promise<Customer> {
    return this.customers.insert(businessId, input);
  }

  async update(
    businessId: string,
    id: string,
    input: UpdateCustomerInput,
  ): Promise<Customer> {
    const existing = await this.customers.findById(businessId, id);
    if (!existing) throw new BusinessError("NOT_FOUND");
    return this.customers.update(businessId, id, input);
  }

  async softDelete(businessId: string, id: string): Promise<void> {
    await this.customers.softDelete(businessId, id);
  }
}
