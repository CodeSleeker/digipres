import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessStatusEnum, Database, Json } from "@/types/database";
import type {
  Business,
  BusinessBrand,
  BusinessHours,
} from "@/types/business-entity";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@/schemas/business";
import {
  SECTION_COLUMN,
  type WebsiteSection,
  type HeroContent,
  type AboutContent,
  type ServicesContent,
  type BarbersContent,
  type GalleryContent,
  type ProductsContent,
  type TestimonialsContent,
  type FaqContent,
  type ContactContent,
  type FooterContent,
} from "@/types/website-content";
import { EMPTY_ONBOARDING, type OnboardingProgress } from "@/types/onboarding";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type BusinessInsert = Database["public"]["Tables"]["businesses"]["Insert"];
type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];

/**
 * Data-access layer for the Business entity. No business rules live here — it
 * only reads/writes rows and maps between DB (snake_case) and domain
 * (camelCase) shapes. The Supabase client is injected so the caller controls
 * auth context (RLS still applies on top of every query).
 *
 * All reads and writes are scoped to active rows (`deleted_at is null`).
 */
export class BusinessRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByOwnerId(ownerId: string): Promise<Business | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  /**
   * Active tenant slugs (+ last update) for the public sitemap. Publicly
   * readable under the "active businesses are publicly readable" RLS policy.
   */
  async listActiveSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("slug,updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(50000);
    if (error) throw error;
    return (data ?? []).map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
  }

  /**
   * Every business cleared to send its own email, for the platform-wide jobs.
   *
   * Filtered in the QUERY rather than by loading all tenants and checking in
   * memory: the digest runs across the whole platform, and the set that can
   * send is a small fraction of it. Service-role only — the owner policies
   * would narrow this to a single row.
   */
  async listNewsletterSenders(): Promise<Business[]> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("*")
      .is("deleted_at", null)
      .eq("status", "active")
      .eq("newsletter_verified", true)
      .not("newsletter_from_email", "is", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toDomain);
  }

  /**
   * PUBLIC tenant lookup. Only `active` businesses resolve — a `draft` tenant
   * hasn't launched and a `suspended` one has had service stopped, so neither
   * should serve a website. The caller renders a 404, exactly as for an unknown
   * slug. Owner/staff lookups use findById / findByOwnerId, which ignore status
   * so the back office can still explain the state.
   */
  async findBySlug(slug: string): Promise<Business | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async findById(id: string): Promise<Business | null> {
    const { data, error } = await this.supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  /** True if an active business already uses this slug (optionally excluding one id). */
  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    let query = this.supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .limit(1);
    if (exceptId) query = query.neq("id", exceptId);
    const { data, error } = await query;
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  async insert(ownerId: string, input: CreateBusinessInput): Promise<Business> {
    const row: BusinessInsert = {
      owner_id: ownerId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      notify_email: input.notifyEmail ?? null,
      notify_phone: input.notifyPhone ?? null,
      notify_customer_sms: input.notifyCustomerSms ?? true,
      address: input.address ?? null,
      address_locality: input.addressLocality ?? null,
      address_region: input.addressRegion ?? null,
      address_postal_code: input.addressPostalCode ?? null,
      address_country: input.addressCountry ?? null,
      logo_url: input.logoUrl ?? null,
      wordmark_url: input.wordmarkUrl ?? null,
      favicon_url: input.faviconUrl ?? null,
      cover_image_url: input.coverImageUrl ?? null,
      category: input.category,
      owner_name: input.ownerName ?? null,
      hours: (input.hours ?? []) as unknown as Json,
      google_review_url: input.googleReviewUrl ?? null,
      facebook_url: input.facebookUrl ?? null,
      instagram_url: input.instagramUrl ?? null,
      tiktok_url: input.tiktokUrl ?? null,
      website_url: input.websiteUrl ?? null,
    };

    const { data, error } = await this.supabase
      .from("businesses")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  /** Partial update: only fields explicitly provided (non-undefined) are written. */
  async update(id: string, input: UpdateBusinessInput): Promise<Business> {
    const patch: BusinessUpdate = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.description !== undefined) patch.description = input.description;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.notifyEmail !== undefined) patch.notify_email = input.notifyEmail;
    if (input.notifyPhone !== undefined) patch.notify_phone = input.notifyPhone;
    if (input.notifyCustomerSms !== undefined)
      patch.notify_customer_sms = input.notifyCustomerSms;
    if (input.smsSenderId !== undefined)
      patch.sms_sender_id = input.smsSenderId;
    if (input.newsletterFromEmail !== undefined)
      patch.newsletter_from_email = input.newsletterFromEmail;
    if (input.newsletterFromName !== undefined)
      patch.newsletter_from_name = input.newsletterFromName;
    // Only a service-role caller may set these; the database refuses an owner
    // session outright (migration 0033).
    if (input.newsletterVerified !== undefined) {
      patch.newsletter_verified = input.newsletterVerified;
      patch.newsletter_verified_at = input.newsletterVerified
        ? new Date().toISOString()
        : null;
    }
    if (input.address !== undefined) patch.address = input.address;
    if (input.addressLocality !== undefined)
      patch.address_locality = input.addressLocality;
    if (input.addressRegion !== undefined)
      patch.address_region = input.addressRegion;
    if (input.addressPostalCode !== undefined)
      patch.address_postal_code = input.addressPostalCode;
    if (input.addressCountry !== undefined)
      patch.address_country = input.addressCountry;
    if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl;
    if (input.wordmarkUrl !== undefined)
      patch.wordmark_url = input.wordmarkUrl;
    if (input.faviconUrl !== undefined) patch.favicon_url = input.faviconUrl;
    if (input.coverImageUrl !== undefined)
      patch.cover_image_url = input.coverImageUrl;
    // `null` is meaningful here: it clears the override so the wordmark goes
    // back to being derived from the business name.
    if (input.brand !== undefined) patch.brand = input.brand as unknown as Json;
    if (input.category !== undefined) patch.category = input.category;
    if (input.ownerName !== undefined) patch.owner_name = input.ownerName;
    if (input.hours !== undefined) patch.hours = input.hours as unknown as Json;
    if (input.googleReviewUrl !== undefined)
      patch.google_review_url = input.googleReviewUrl;
    if (input.facebookUrl !== undefined) patch.facebook_url = input.facebookUrl;
    if (input.instagramUrl !== undefined)
      patch.instagram_url = input.instagramUrl;
    if (input.tiktokUrl !== undefined) patch.tiktok_url = input.tiktokUrl;
    if (input.websiteUrl !== undefined) patch.website_url = input.websiteUrl;

    const { data, error } = await this.supabase
      .from("businesses")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  /** Overwrite a single editable website-content section. */
  async updateContent(
    id: string,
    section: WebsiteSection,
    data: unknown,
  ): Promise<Business> {
    const patch: BusinessUpdate = {
      [SECTION_COLUMN[section]]: data as Json,
    };
    const { data: row, error } = await this.supabase
      .from("businesses")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(row);
  }

  /** Overwrite onboarding progress. */
  async updateOnboarding(
    id: string,
    progress: OnboardingProgress,
  ): Promise<Business> {
    const { data, error } = await this.supabase
      .from("businesses")
      .update({ google_onboarding: progress as unknown as Json })
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  /**
   * Lifecycle control (draft / active / suspended).
   *
   * Callers must pass a SERVICE-ROLE client: the only UPDATE policy on
   * `businesses` is owner-scoped, so a staff session would match zero rows and
   * fail silently. Authorization is enforced in features/platform/lifecycle.ts.
   */
  async setStatus(id: string, status: BusinessStatusEnum): Promise<void> {
    const { error } = await this.supabase
      .from("businesses")
      .update({ status })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("businesses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
  }
}

function toDomain(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    phone: row.phone,
    email: row.email,
    notifyEmail: row.notify_email,
    notifyPhone: row.notify_phone,
    notifyCustomerSms: row.notify_customer_sms ?? true,
    smsSenderId: row.sms_sender_id ?? null,
    newsletterFromEmail: row.newsletter_from_email ?? null,
    newsletterFromName: row.newsletter_from_name ?? null,
    newsletterVerified: row.newsletter_verified ?? false,
    newsletterVerifiedAt: row.newsletter_verified_at ?? null,
    address: row.address,
    addressLocality: row.address_locality,
    addressRegion: row.address_region,
    addressPostalCode: row.address_postal_code,
    addressCountry: row.address_country,
    logoUrl: row.logo_url,
    wordmarkUrl: row.wordmark_url ?? null,
    faviconUrl: row.favicon_url,
    coverImageUrl: row.cover_image_url,
    category: row.category,
    ownerName: row.owner_name,
    hours: (row.hours ?? []) as unknown as BusinessHours,
    googleReviewUrl: row.google_review_url,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    websiteUrl: row.website_url,
    content: {
      hero: (row.hero_content as unknown as HeroContent) ?? null,
      about: (row.about_content as unknown as AboutContent) ?? null,
      services: (row.services_content as unknown as ServicesContent) ?? null,
      barbers: (row.barbers_content as unknown as BarbersContent) ?? null,
      gallery: (row.gallery_content as unknown as GalleryContent) ?? null,
      products: (row.products_content as unknown as ProductsContent) ?? null,
      testimonials:
        (row.testimonials_content as unknown as TestimonialsContent) ?? null,
      faq: (row.faq_content as unknown as FaqContent) ?? null,
      contact: (row.contact_content as unknown as ContactContent) ?? null,
      footer: (row.footer_content as unknown as FooterContent) ?? null,
    },
    onboarding: toOnboarding(row.google_onboarding),
    templateCode: row.template_code,
    themeCode: row.theme_code,
    status: row.status,
    brand: (row.brand as BusinessBrand | null) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toOnboarding(value: Json | null): OnboardingProgress {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray((value as { completedSteps?: unknown }).completedSteps)
  ) {
    return value as unknown as OnboardingProgress;
  }
  return EMPTY_ONBOARDING;
}
