import { requireUser } from "@/lib/auth/require-user";
import { BusinessRepository } from "@/repositories/business-repository";
import { ReviewMessageRepository } from "@/repositories/review-message-repository";
import type { ReviewMessageListResult } from "@/types/review-message";
import type { ReviewMessageListQueryInput } from "@/schemas/review-message";

export async function getReviewMessages(
  query: ReviewMessageListQueryInput,
): Promise<ReviewMessageListResult> {
  const { supabase, user } = await requireUser();
  const business = await new BusinessRepository(supabase).findByOwnerId(
    user.id,
  );
  if (!business) {
    return {
      rows: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: 1,
    };
  }
  return new ReviewMessageRepository(supabase).list(business.id, query);
}
