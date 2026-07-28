/** A hostname mapped to a business (custom domain, apex or www). */
export interface BusinessDomain {
  id: string;
  businessId: string;
  /** Normalized: lowercase, no scheme/port/path. */
  hostname: string;
  /** The canonical public hostname for this business (at most one). */
  isPrimary: boolean;
  /** Only verified hostnames are ever routed. Set server-side after the DNS check. */
  verified: boolean;
  verificationToken: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Minimal host → tenant mapping used by routing (middleware / Edge Config sync).
 * Keeping this narrow means the edge only carries what it needs.
 */
export interface DomainRoute {
  hostname: string;
  slug: string;
  isPrimary: boolean;
}
