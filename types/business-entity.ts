import type { BusinessCategoryEnum, BusinessStatusEnum } from "./database";
import type { WebsiteContent } from "./website-content";
import type { OnboardingProgress } from "./onboarding";

/**
 * Domain model for the Business entity (camelCase), distinct from:
 *  - types/database.ts    → raw snake_case DB rows
 *  - types/business.ts    → BusinessProfile, the template rendering contract
 *
 * The repository maps DB rows ⇆ this shape so the service/actions/UI never deal
 * in snake_case or raw Json.
 */

export type BusinessCategory = BusinessCategoryEnum;
export type BusinessStatus = BusinessStatusEnum;

/** 0 = Sunday … 6 = Saturday. Times are 24h "HH:mm"; null when closed. */
export interface DayHours {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  closed: boolean;
  open: string | null;
  close: string | null;
}

export type BusinessHours = DayHours[];

/**
 * Two-tone wordmark, e.g. RONIES (primary) + BARBER (accent), plus the single
 * letter used for the logo mark.
 */
export interface BusinessBrand {
  namePrimary: string;
  nameAccent: string;
  initial: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  /** Where booking alerts are emailed. Falls back to `email` when null. */
  notifyEmail: string | null;
  /** Where booking alerts are texted. Falls back to `phone` when null. */
  notifyPhone: string | null;
  /**
   * Send booking acknowledgement/confirmation texts to CUSTOMERS. The owner's
   * own alerts are separate and unaffected. Never overrides an opt-out.
   */
  notifyCustomerSms: boolean;
  /**
   * Alphanumeric label the recipient sees instead of a number, registered with
   * the carrier for THIS business (max 11 chars). Super admin only — it is an
   * arrangement with the carrier, not a tenant preference.
   *
   * null means "no explicit sender": Semaphore falls back to the account's
   * registered default, PhilSMS refuses to send, Twilio never uses it at all.
   */
  smsSenderId: string | null;
  /**
   * The address this tenant's weekly digest is sent from, on a domain THEY
   * control — never the platform's.
   *
   * Bulk mail and transactional mail must not share a sending reputation: a
   * newsletter complaint against one client would otherwise push every other
   * client's booking confirmations into spam. Keeping each tenant on their own
   * domain makes that impossible by construction.
   */
  newsletterFromEmail: string | null;
  /** Display name on the digest. Falls back to the business name. */
  newsletterFromName: string | null;
  /**
   * Whether the sending domain has been checked (SPF/DKIM) and the digest may
   * actually send.
   *
   * Set by the platform after verifying DNS, never by the owner — otherwise
   * anyone could send as a domain they merely typed in. Enforced in the
   * database (migration 0033), not just here. Changing the address clears it.
   */
  newsletterVerified: boolean;
  newsletterVerifiedAt: string | null;
  /**
   * Street line ONLY. The remaining components are the fields below.
   *
   * Rows created before migration 0027 hold a whole address here; that still
   * renders and still emits as `streetAddress`, it just isn't split.
   */
  address: string | null;
  /** City or town — schema.org `addressLocality`. */
  addressLocality: string | null;
  /** Province or state — `addressRegion`. */
  addressRegion: string | null;
  addressPostalCode: string | null;
  /** ISO 3166-1 alpha-2, e.g. "PH" — `addressCountry`. */
  addressCountry: string | null;
  logoUrl: string | null;
  /**
   * Optional image of the business NAME for the header (migration 0030).
   * When set it replaces the text wordmark; a tenant whose logo is a single
   * lockup puts it here and leaves logoUrl empty.
   */
  wordmarkUrl: string | null;
  /** Square browser-tab icon; falls back to `logoUrl` (see lib/tenant/icons.ts). */
  faviconUrl: string | null;
  coverImageUrl: string | null;
  category: BusinessCategory;
  ownerName: string | null;
  hours: BusinessHours;
  googleReviewUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  websiteUrl: string | null;
  /** Editable per-section website content (null members fall back to defaults). */
  content: WebsiteContent;
  /** Google Business Profile onboarding wizard progress. */
  onboarding: OnboardingProgress;
  /** Which website template/theme this tenant uses (see templates/registry.ts). */
  templateCode: string;
  themeCode: string;
  /** Wordmark override; derived from `name` when null. */
  brand: BusinessBrand | null;
  /** Lifecycle: draft (staff-created), active, or suspended. */
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
