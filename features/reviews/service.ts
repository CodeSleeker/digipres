import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ReviewMessageRepository } from "@/repositories/review-message-repository";
import { CustomerRepository } from "@/repositories/customer-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { ReviewAutomationService } from "@/services/review-automation-service";
import { getSmsSender } from "@/lib/sms/sender";

/** Assemble the review-automation service for a given Supabase client. */
export function makeReviewAutomationService(
  supabase: SupabaseClient<Database>,
): ReviewAutomationService {
  return new ReviewAutomationService(
    new ReviewMessageRepository(supabase),
    new CustomerRepository(supabase),
    new BusinessRepository(supabase),
    getSmsSender(),
  );
}
