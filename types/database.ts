/**
 * Supabase database types (hand-written in the generated-file style).
 *
 * Once the Supabase project is linked, regenerate this with:
 *   npx supabase gen types typescript --linked > types/database.ts
 * and keep it in sync after every migration (skill: "Always generate
 * TypeScript types after schema changes").
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BusinessCategoryEnum =
  | "barber"
  | "salon"
  | "spa"
  | "clinic"
  | "dental"
  | "construction"
  | "restaurant"
  | "cafe"
  | "retail"
  | "automotive"
  | "fitness"
  | "other";

export type CustomerReviewStatusEnum = "pending" | "requested" | "received";

export type CustomerSmsStatusEnum =
  "not_sent" | "sent" | "failed" | "opted_out";

export type AppointmentStatusEnum =
  "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export type ReviewMessageStepEnum = "thank_you" | "review_request" | "reminder";

export type PlatformRoleEnum = "super_admin" | "support" | "read_only";

export type BusinessStatusEnum = "draft" | "active" | "suspended";

export type JobStatusEnum = "success" | "failed";

export type SubscriptionStatusEnum =
  "trialing" | "active" | "past_due" | "canceled";

export type ReviewMessageStatusEnum =
  "queued" | "sent" | "delivered" | "failed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          address_locality: string | null;
          address_region: string | null;
          address_postal_code: string | null;
          address_country: string | null;
          logo_url: string | null;
          favicon_url: string | null;
          notify_email: string | null;
          notify_phone: string | null;
          notify_customer_sms: boolean;
          sms_sender_id: string | null;
          cover_image_url: string | null;
          category: BusinessCategoryEnum;
          owner_name: string | null;
          hours: Json;
          google_review_url: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          tiktok_url: string | null;
          website_url: string | null;
          hero_content: Json | null;
          about_content: Json | null;
          services_content: Json | null;
          barbers_content: Json | null;
          gallery_content: Json | null;
          products_content: Json | null;
          testimonials_content: Json | null;
          contact_content: Json | null;
          footer_content: Json | null;
          google_onboarding: Json | null;
          template_code: string;
          theme_code: string;
          status: BusinessStatusEnum;
          brand: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          address_locality?: string | null;
          address_region?: string | null;
          address_postal_code?: string | null;
          address_country?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          notify_email?: string | null;
          notify_phone?: string | null;
          notify_customer_sms?: boolean;
          sms_sender_id?: string | null;
          cover_image_url?: string | null;
          category?: BusinessCategoryEnum;
          owner_name?: string | null;
          hours?: Json;
          google_review_url?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          website_url?: string | null;
          hero_content?: Json | null;
          about_content?: Json | null;
          services_content?: Json | null;
          barbers_content?: Json | null;
          gallery_content?: Json | null;
          products_content?: Json | null;
          testimonials_content?: Json | null;
          contact_content?: Json | null;
          footer_content?: Json | null;
          google_onboarding?: Json | null;
          template_code?: string;
          theme_code?: string;
          status?: BusinessStatusEnum;
          brand?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          address_locality?: string | null;
          address_region?: string | null;
          address_postal_code?: string | null;
          address_country?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          notify_email?: string | null;
          notify_phone?: string | null;
          notify_customer_sms?: boolean;
          sms_sender_id?: string | null;
          cover_image_url?: string | null;
          category?: BusinessCategoryEnum;
          owner_name?: string | null;
          hours?: Json;
          google_review_url?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          website_url?: string | null;
          hero_content?: Json | null;
          about_content?: Json | null;
          services_content?: Json | null;
          barbers_content?: Json | null;
          gallery_content?: Json | null;
          products_content?: Json | null;
          testimonials_content?: Json | null;
          contact_content?: Json | null;
          footer_content?: Json | null;
          google_onboarding?: Json | null;
          template_code?: string;
          theme_code?: string;
          status?: BusinessStatusEnum;
          brand?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          mobile: string | null;
          email: string | null;
          address: string | null;
          last_visit: string | null;
          preferred_staff: string | null;
          services_availed: string[];
          notes: string | null;
          review_status: CustomerReviewStatusEnum;
          sms_status: CustomerSmsStatusEnum;
          sms_consent_at: string | null;
          sms_opted_out_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          mobile?: string | null;
          email?: string | null;
          address?: string | null;
          last_visit?: string | null;
          preferred_staff?: string | null;
          services_availed?: string[];
          notes?: string | null;
          review_status?: CustomerReviewStatusEnum;
          sms_status?: CustomerSmsStatusEnum;
          sms_consent_at?: string | null;
          sms_opted_out_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          mobile?: string | null;
          email?: string | null;
          address?: string | null;
          last_visit?: string | null;
          preferred_staff?: string | null;
          services_availed?: string[];
          notes?: string | null;
          review_status?: CustomerReviewStatusEnum;
          sms_status?: CustomerSmsStatusEnum;
          sms_consent_at?: string | null;
          sms_opted_out_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          service: string | null;
          staff: string | null;
          status: AppointmentStatusEnum;
          starts_at: string;
          ends_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          service?: string | null;
          staff?: string | null;
          status?: AppointmentStatusEnum;
          starts_at: string;
          ends_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          service?: string | null;
          staff?: string | null;
          status?: AppointmentStatusEnum;
          starts_at?: string;
          ends_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          user_id: string;
          role: PlatformRoleEnum;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: PlatformRoleEnum;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: PlatformRoleEnum;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          code: string;
          name: string;
          price_cents: number;
          interval: string;
          features: Json;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          price_cents?: number;
          interval?: string;
          features?: Json;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          price_cents?: number;
          interval?: string;
          features?: Json;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan_id: string;
          status: SubscriptionStatusEnum;
          current_period_end: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan_id: string;
          status?: SubscriptionStatusEnum;
          current_period_end?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          plan_id?: string;
          status?: SubscriptionStatusEnum;
          current_period_end?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_features: {
        Row: {
          business_id: string;
          feature_key: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          feature_key: string;
          enabled: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          feature_key?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_runs: {
        Row: {
          id: string;
          job: string;
          status: JobStatusEnum;
          started_at: string;
          finished_at: string;
          processed: number;
          sent: number;
          failed: number;
          error: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          job: string;
          status: JobStatusEnum;
          started_at: string;
          finished_at?: string;
          processed?: number;
          sent?: number;
          failed?: number;
          error?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          job?: string;
          status?: JobStatusEnum;
          started_at?: string;
          finished_at?: string;
          processed?: number;
          sent?: number;
          failed?: number;
          error?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_user_id: string | null;
          acting_business_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          metadata: Json;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          acting_business_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          ip?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          acting_business_id?: string | null;
          action?: string;
          entity?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          ip?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      business_domains: {
        Row: {
          id: string;
          business_id: string;
          hostname: string;
          is_primary: boolean;
          verified: boolean;
          verification_token: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          hostname: string;
          is_primary?: boolean;
          verified?: boolean;
          verification_token?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          hostname?: string;
          is_primary?: boolean;
          verified?: boolean;
          verification_token?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_messages: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          appointment_id: string | null;
          step: ReviewMessageStepEnum;
          status: ReviewMessageStatusEnum;
          body: string;
          to_mobile: string;
          customer_name: string;
          scheduled_at: string;
          sent_at: string | null;
          delivered_at: string | null;
          attempts: number;
          last_error: string | null;
          provider_message_id: string | null;
          claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          appointment_id?: string | null;
          step: ReviewMessageStepEnum;
          status?: ReviewMessageStatusEnum;
          body: string;
          to_mobile: string;
          customer_name: string;
          scheduled_at: string;
          sent_at?: string | null;
          delivered_at?: string | null;
          attempts?: number;
          last_error?: string | null;
          provider_message_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          appointment_id?: string | null;
          step?: ReviewMessageStepEnum;
          status?: ReviewMessageStatusEnum;
          body?: string;
          to_mobile?: string;
          customer_name?: string;
          scheduled_at?: string;
          sent_at?: string | null;
          delivered_at?: string | null;
          attempts?: number;
          last_error?: string | null;
          provider_message_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /**
       * Atomically claim due queued review messages (migration 0008).
       * `p_business_id` null = every tenant, i.e. the scheduler only (0017).
       */
      claim_due_review_messages: {
        Args: { p_limit: number; p_now: string; p_business_id: string | null };
        Returns: Database["public"]["Tables"]["review_messages"]["Row"][];
      };
      /** Age-based retention purge, service-role only (migration 0018). */
      purge_expired_rows: {
        Args: {
          p_message_days: number;
          p_job_run_days: number;
          p_audit_days: number;
        };
        Returns: {
          messages_deleted: number;
          job_runs_deleted: number;
          audit_deleted: number;
        }[];
      };
    };
    Enums: {
      business_category: BusinessCategoryEnum;
      customer_review_status: CustomerReviewStatusEnum;
      customer_sms_status: CustomerSmsStatusEnum;
      appointment_status: AppointmentStatusEnum;
      review_message_step: ReviewMessageStepEnum;
      review_message_status: ReviewMessageStatusEnum;
      platform_role: PlatformRoleEnum;
      business_status: BusinessStatusEnum;
      job_status: JobStatusEnum;
      subscription_status: SubscriptionStatusEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}
