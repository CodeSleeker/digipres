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
  address: string | null;
  logoUrl: string | null;
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
