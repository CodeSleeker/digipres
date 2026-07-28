import type {
  CustomerReviewStatusEnum,
  CustomerSmsStatusEnum,
} from "./database";

/** Domain model for a customer (camelCase), mapped from the DB row. */
export type ReviewStatus = CustomerReviewStatusEnum;
export type SmsStatus = CustomerSmsStatusEnum;

export const REVIEW_STATUSES: ReviewStatus[] = [
  "pending",
  "requested",
  "received",
];
export const SMS_STATUSES: SmsStatus[] = [
  "not_sent",
  "sent",
  "failed",
  "opted_out",
];

/** Human labels for the status enums. */
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  requested: "Requested",
  received: "Received",
};
export const SMS_STATUS_LABEL: Record<SmsStatus, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  failed: "Failed",
  opted_out: "Opted out",
};

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  /** ISO date (YYYY-MM-DD) or null. */
  lastVisit: string | null;
  preferredStaff: string | null;
  servicesAvailed: string[];
  notes: string | null;
  reviewStatus: ReviewStatus;
  smsStatus: SmsStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Parameters for a paginated, searchable, filterable customer list. */
export interface CustomerListQuery {
  q?: string;
  reviewStatus?: ReviewStatus;
  smsStatus?: SmsStatus;
  page: number;
  pageSize: number;
}

export interface CustomerListResult {
  rows: Customer[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
