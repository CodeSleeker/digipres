import { z } from "zod";
import {
  REVIEW_MESSAGE_STATUSES,
  type ReviewMessageStatus,
} from "@/types/review-message";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const statusSchema = z.enum(
  REVIEW_MESSAGE_STATUSES as [ReviewMessageStatus, ...ReviewMessageStatus[]],
);

export const reviewMessageListQuerySchema = z.object({
  status: z
    .preprocess(emptyToUndefined, statusSchema.optional())
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20).default(20),
});

export type ReviewMessageListQueryInput = z.infer<
  typeof reviewMessageListQuerySchema
>;
