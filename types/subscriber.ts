/**
 * The mailing list, and what a business has made lately.
 *
 * Deliberately separate from `Customer`: a subscriber is someone who asked to
 * hear from a business, which is not the same relationship as having bought
 * from them. Mixing the two would put people who have never been served into
 * the CRM — and, worse, into the review-request workflow, which iterates
 * customers and would text a stranger "thanks for your visit".
 */

export type SubscriberStatus = "pending" | "subscribed" | "unsubscribed";

export interface Subscriber {
  id: string;
  businessId: string;
  email: string;
  status: SubscriberStatus;
  /** What they were shown when they agreed. Null for rows predating consent capture. */
  consentText: string | null;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  source: string | null;
  createdAt: string;
}

/** A subscriber plus the token needed to mail them. Service-role reads only. */
export interface SendableSubscriber {
  id: string;
  email: string;
  unsubscribeToken: string;
}

export interface SubscriberCounts {
  subscribed: number;
  pending: number;
  unsubscribed: number;
}

export interface Creation {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  /**
   * When it counts as new. The digest windows on this rather than `createdAt`,
   * so an owner can write something up ahead of time, or add last week's bake
   * without it arriving in inboxes as news.
   */
  publishedAt: string;
  createdAt: string;
}

export interface DigestRun {
  id: string;
  businessId: string;
  coveredFrom: string;
  coveredTo: string;
  creationCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}
