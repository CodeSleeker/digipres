import type { Metadata } from "next";
import { apexMode } from "@/lib/marketing/mode";
import { LandingPage } from "@/components/marketing/landing";
import { loadBusinessProfile } from "@/lib/website/load-profile";
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
    const title = "Aliamz Digital — Websites & growth for local businesses";
    const description =
      "We build and run your website, review automation and customer tools in one dashboard, so you can focus on the work.";
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
