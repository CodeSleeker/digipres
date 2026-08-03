import type { Metadata } from "next";
import { apexMode } from "@/lib/marketing/mode";
import { LandingPage } from "@/components/marketing/landing";
import { loadBusinessProfile } from "@/lib/website/load-profile";
import { tenantIcons } from "@/lib/tenant/icons";
import { loadTemplate } from "@/templates/registry";

/**
 * Apex `/` entry point — two modes (lib/marketing/mode.ts):
 *
 * - production (no DEV_BUSINESS_SLUG): the Aliamz Digital marketing page. The
 *   platform's own front door — never a tenant's site.
 * - local dev (DEV_BUSINESS_SLUG set): that tenant's site, as a preview
 *   convenience. Real tenant traffic arrives via subdomains/custom domains,
 *   which the middleware rewrites to /s/<slug> before this route runs.
 */
export async function generateMetadata(): Promise<Metadata> {
  if (apexMode(process.env) === "landing") {
    // "·" is the separator the rest of the site's titles already use
    // ("Sign in · Aliamz Digital"), so the brand reads consistently in a tab
    // strip and in search results.
    const title =
      "Aliamz Digital · Custom software, web, mobile, AI & IoT development";
    const description =
      "We design and build custom software: web and mobile applications, AI, IoT and enterprise systems. We also run a ready-made website, reviews and CRM platform for local businesses.";
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
      twitter: { card: "summary", title, description },
    };
  }

  const business = await loadBusinessProfile();
  const { title, description } = business.seo;
  return {
    title,
    description,
    // Dev preview of a real tenant — show that tenant's icon, not the
    // platform's, so this route looks like what /s/<slug> will serve. Only the
    // profile is loaded here, so the dedicated faviconUrl isn't in reach; the
    // logo and the generated tile are.
    icons: tenantIcons(
      { faviconUrl: null, logoUrl: business.brand.logoUrl },
      business.brand.initial,
    ),
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page() {
  if (apexMode(process.env) === "landing") {
    return <LandingPage />;
  }

  // Dev preview: CMS saves call revalidatePath("/"), so edits appear here.
  const business = await loadBusinessProfile();
  const { Component } = await loadTemplate(null);
  return <Component business={business} />;
}
