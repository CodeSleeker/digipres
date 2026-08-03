import { readFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import { loadTenantBySlug } from "@/lib/tenant/profile";
import { themePalette } from "@/templates/themes";
import { iconInitial } from "@/lib/tenant/icons";
import { fetchLogoDataUri } from "@/lib/tenant/og-logo";
import { formatLocality } from "@/lib/businesses/address";

/**
 * The share card for a tenant's website — what appears when their link is
 * posted to Messenger, WhatsApp, Viber, Facebook, LinkedIn or Slack.
 *
 * Generated per request rather than baked when the owner uploads a logo. The
 * alternative needs a storage bucket, regeneration on every rename, cleanup on
 * delete and a backfill for existing tenants; each of those is a place for the
 * card to drift out of step with the site. Rendering from the live record means
 * it cannot.
 *
 * SVG would have been cheaper — the favicon route already does that — but the
 * major crawlers reject SVG for og:image, so this has to be a real raster.
 *
 * Colours come from the tenant's own template + theme (templates/themes.ts), so
 * a client's card looks like their site rather than like the platform's.
 *
 * NOTE ON CACHING: this is a distinct route from the page, so
 * `revalidatePath("/s/<slug>")` does NOT clear it. lib/tenant/revalidate.ts
 * clears this path explicitly; without that, a renamed business would keep
 * showing its old card indefinitely with nothing to indicate it.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Static by necessity — Next only accepts a constant here, not a function of
// the tenant. Kept generic rather than naming a business it may not describe.
export const alt = "Website preview";

/**
 * Satori has no access to system fonts or CSS @font-face; the bytes must be
 * handed to it.
 *
 * `readFileSync`, NOT `fetch`. The documented `fetch(new URL(..., import.meta.url))`
 * pattern is for the edge runtime — under Node, undici refuses `file://` and
 * throws "not implemented... yet...", which surfaces as a bare 500 on a route
 * only crawlers request. The URL form is kept so Next still traces these files
 * into the deployment bundle.
 */
function fonts() {
  const load = (file: string) =>
    readFileSync(new URL(`../../../assets/fonts/${file}`, import.meta.url));
  return [
    {
      name: "Inter",
      data: load("Inter-Regular.ttf"),
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Inter",
      data: load("Inter-Bold.ttf"),
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}

/**
 * Trim to `max` at a word boundary. A hard slice leaves things like
 * "Precision cuts, sharp …", which reads as a rendering fault rather than an
 * abbreviation.
 */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  // Only honour the boundary if it doesn't throw most of the line away.
  const kept = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${kept.replace(/[\s,;:.–—-]+$/, "")}…`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await loadTenantBySlug(slug);

  // An unknown slug still has to answer with an image: crawlers request this
  // path directly, and a 500 here is worse than a plain card.
  const name = tenant?.business.name ?? "";
  const palette = themePalette(
    tenant?.business.templateCode,
    tenant?.business.themeCode,
  );
  /*
   * The place, and nothing else beneath the name.
   *
   * Not the SEO description: every chat app already renders og:description as
   * text BESIDE this image, so baking it in duplicates what is on screen and
   * competes with itself at thumbnail size. The locality is not duplicated
   * anywhere, and for a local business it is the detail that decides the tap.
   *
   * Not the street line either — see formatLocality.
   */
  const place = tenant?.business
    ? (formatLocality(tenant.business) ?? "")
    : "";
  const logo = await fetchLogoDataUri(tenant?.business.logoUrl);
  const initial = iconInitial(tenant?.profile.brand.initial || name);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: palette.background,
          fontFamily: "Inter",
          padding: 72,
          // Satori needs an explicit position for the accent bar below.
          position: "relative",
        }}
      >
        {/* Logo, or the same initial tile the favicon falls back to. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 168,
            height: 168,
            borderRadius: 34,
            background: palette.surface,
            border: `2px solid ${palette.border}`,
            overflow: "hidden",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              width={168}
              height={168}
              style={{ objectFit: "contain", width: 140, height: 140 }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                fontSize: initial.length > 1 ? 68 : 88,
                fontWeight: 700,
                color: palette.accent,
              }}
            >
              {initial}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 44,
            fontSize: name.length > 26 ? 62 : 78,
            fontWeight: 700,
            color: palette.foreground,
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: 1000,
          }}
        >
          {name || "Website"}
        </div>

        {place && (
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 32,
              color: palette.muted,
              textAlign: "center",
              maxWidth: 940,
            }}
          >
            {clip(place, 60)}
          </div>
        )}

        {/* Accent bar: the one piece of the tenant's brand that reads even at
            the thumbnail size a chat app renders. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 12,
            background: palette.accent,
          }}
        />
      </div>
    ),
    { ...size, fonts: fonts() },
  );
}
