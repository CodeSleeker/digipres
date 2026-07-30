import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadTenantBySlug } from "@/lib/tenant/profile";
import { canonicalUrlFor } from "@/lib/tenant/urls";
import { tenantIcons } from "@/lib/tenant/icons";
import { buildLocalBusinessJsonLd } from "@/lib/seo/json-ld";
import { JsonLd } from "@/components/json-ld";
import { loadTemplate } from "@/templates/registry";

// ISR: cache the rendered tenant site and refresh hourly. CMS/onboarding saves
// invalidate the specific /s/<slug> path immediately (see lib/tenant/revalidate).
export const revalidate = 3600;

/**
 * Public tenant website, addressed by business slug.
 *
 * Reached two ways:
 *  - directly, e.g. /s/ronies (used locally and on the apex domain), and
 *  - via a middleware rewrite from a tenant subdomain (ronies.example.com → /s/ronies).
 *
 * Content is resolved from the database for THIS slug only, so tenants are fully
 * isolated on the public side too. An unknown slug renders a 404.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await loadTenantBySlug(slug);
  if (!tenant) return {};

  const { title, description } = tenant.profile.seo;
  const canonical = canonicalUrlFor(slug, tenant.primaryHostname);
  return {
    metadataBase: new URL(canonical),
    title,
    description,
    // Replaces the platform icons from the root layout — this is the client's
    // site, so it gets the client's mark.
    icons: tenantIcons(tenant.business, tenant.profile.brand.initial),
    alternates: { canonical },
    openGraph: { title, description, type: "website", url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TenantSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await loadTenantBySlug(slug);
  if (!tenant) notFound();

  // The tenant's own template — an unknown code falls back rather than 500s.
  const { Component } = await loadTemplate(tenant.business.templateCode);

  return (
    <div data-theme={tenant.business.themeCode}>
      <JsonLd
        data={buildLocalBusinessJsonLd(
          tenant.business,
          canonicalUrlFor(slug, tenant.primaryHostname),
        )}
      />
      <Component business={tenant.profile} />
    </div>
  );
}
