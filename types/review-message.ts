import type {
  ReviewMessageStepEnum,
  ReviewMessageStatusEnum,
} from "./database";

export type ReviewMessageStep = ReviewMessageStepEnum;
export type ReviewMessageStatus = ReviewMessageStatusEnum;

export const REVIEW_MESSAGE_STATUSES: ReviewMessageStatus[] = [
  "queued",
  "sent",
  "delivered",
  "failed",
  "cancelled",
];

export const REVIEW_STEP_LABEL: Record<ReviewMessageStep, string> = {
  thank_you: "Thank you",
  review_request: "Review request",
  reminder: "Reminder",
};

export const REVIEW_MESSAGE_STATUS_LABEL: Record<ReviewMessageStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

export interface ReviewMessage {
  id: string;
  businessId: string;
  customerId: string;
  appointmentId: string | null;
  step: ReviewMessageStep;
  status: ReviewMessageStatus;
  body: string;
  toMobile: string;
  customerName: string;
  scheduledAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Insert shape for a queued message (status/attempts default in the DB). */
export interface NewReviewMessage {
  businessId: string;
  customerId: string;
  appointmentId: string | null;
  step: ReviewMessageStep;
  body: string;
  toMobile: string;
  customerName: string;
  scheduledAt: string;
}

export interface ReviewMessageListQuery {
  status?: ReviewMessageStatus;
  page: number;
  pageSize: number;
}

export interface ReviewMessageListResult {
  rows: ReviewMessage[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
}
