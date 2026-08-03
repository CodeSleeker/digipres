import type { Metadata } from "next";
import { apexMode } from "@/lib/marketing/mode";
import { LandingPage } from "@/components/marketing/landing";
import { loadBusinessProfile } from "@/lib/website/load-profile";
import { tenantIcons } from "@/lib/tenant/icons";
import { loadTemplate } from "@/templates/registry";
import { siteBaseUrl } from "@/lib/tenant/urls";

/**
 * The share card for the platform's own front door.
 *
 * 1200×630 is the size Facebook, LinkedIn, Slack and X all render largest and
 * crop least. Dimensions are declared alongside the path because several
 * crawlers lay the card out from the tags BEFORE they finish fetching the file
 * — omit them and the first render of a link can collapse to a thumbnail.
 */
const OG_IMAGE = {
  path: "/brand/og-image.png",
  width: 1200,
  height: 630,
} as const;

/** `new URL()` throws on a schemeless value; metadata is not worth a 500. */
function safeUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

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
    const url = siteBaseUrl();
    return {
      title,
      description,
      /*
       * Open Graph requires an ABSOLUTE image URL, and this route builds one
       * itself rather than leaning on `metadataBase` to resolve a relative path.
       *
       * That is deliberate. `new URL()` THROWS on a value with no scheme, and
       * NEXT_PUBLIC_SITE_URL is hand-entered per environment — one deploy with
       * "aliamz.com" instead of "https://aliamz.com" would turn a metadata
       * convenience into a 500 on the home page. `metadataBase` is still set
       * when the value parses, for anything else that wants it, but nothing
       * here depends on it.
       */
      metadataBase: safeUrl(url),
      openGraph: {
        title,
        description,
        type: "website",
        url,
        siteName: "Aliamz Digital",
        images: [
          {
            url: `${url}${OG_IMAGE.path}`,
            width: OG_IMAGE.width,
            height: OG_IMAGE.height,
            alt: "Aliamz Digital — Digital Solutions. Real Impact.",
          },
        ],
      },
      twitter: {
        // Was "summary", the small square card. With an image to show, the wide
        // card is the one worth having.
        card: "summary_large_image",
        title,
        description,
        images: [`${url}${OG_IMAGE.path}`],
      },
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
