"use server";

import { revalidatePath } from "next/cache";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { featureError } from "@/lib/features/guard";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { makeReviewAutomationService } from "./service";

export type ProcessNowResult = {
  processed: number;
  sent: number;
  failed: number;
  error?: string;
};

/**
 * Manually run the processor for the current owner's due messages (for testing
 * without waiting on the cron). RLS scopes it to this owner's rows.
 */
export async function processDueNow(): Promise<ProcessNowResult> {
  const context = await getOwnerContext();
  const { supabase, businessId } = context;

  const denied = await featureError(supabase, businessId, "reviews");
  if (denied) return { processed: 0, sent: 0, failed: 0, error: denied };

  try {
    // Scoped to THIS tenant. Under impersonation `supabase` is service-role, so
    // an unscoped run would claim and send every other client's messages too.
    const result = await makeReviewAutomationService(supabase).processDue(
      new Date().toISOString(),
      100,
      businessId,
    );
    // Staff can cause real SMS to be sent to a client's customers.
    await auditTenantAction(context, "reviews.processed_now", {
      metadata: { sent: result.sent, failed: result.failed },
    });
    revalidatePath("/admin/reviews");
    return result;
  } catch (error) {
    console.error("[reviews:process]", error);
    return { processed: 0, sent: 0, failed: 0, error: "Failed to process." };
  }
}
