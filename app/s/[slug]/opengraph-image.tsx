import { readFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import { loadTenantBySlug } from "@/lib/tenant/profile";
import { themePalette } from "@/templates/themes";
import { iconInitial } from "@/lib/tenant/icons";
import { cardPhoto, fetchCardImage } from "@/lib/tenant/og-image";
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
 * TWO LAYOUTS, chosen by whether the tenant has a hero photograph. With one,
 * the card IS that photograph, the name set over a scrim — which is what a
 * trade sold on images (an event stylist, a patisserie) needs a share card to
 * do. Without one, the typographic card: logo or initial tile, name, place.
 * The barber's hero is a scrubbed frame sequence with no still behind it, so
 * that template keeps the card it has always had.
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
  const logo = await fetchCardImage(tenant?.business.logoUrl);
  const initial = iconInitial(tenant?.profile.brand.initial || name);

  /*
   * The photograph, when the tenant has one the card can stand on. Capped at
   * 2.5s by `fetchCardImage`, which hands back null on anything going wrong —
   * a crawler is waiting, and the typographic card below is a fine answer.
   */
  const photo = await fetchCardImage(cardPhoto(tenant?.profile ?? null));

  if (photo) {
    return new ImageResponse(
      (
        /*
         * NO ABSOLUTE POSITIONING, deliberately. Satori supports it only
         * partially: with several absolute children the accent bar was laid
         * out as a flex ITEM instead, stretching into a gold stripe down the
         * left edge. Plain flow does the same job — the photograph is the
         * root's background, the caption sits at the end of the column, and
         * the rule is the last thing after it.
         */
        <div
          style={{
            width: size.width,
            height: size.height,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            fontFamily: "Inter",
            backgroundImage: `url(${photo})`,
            backgroundSize: `${size.width}px ${size.height}px`,
            backgroundPosition: "center",
          }}
        >
          {/*
           * An OPAQUE band, and both halves of that are the result of testing
           * rather than taste.
           *
           * Satori flattens `linear-gradient` into a single hard-edged wash,
           * which reads as a rendering fault rather than a scrim. And it does
           * not honour `rgba()` alpha here — a band asked for at 72% black
           * came out nearer 25%, with the photograph showing straight through
           * the text. `backgroundColor` with a solid hex is what it renders
           * faithfully.
           *
           * Opaque is also the safer design. This has to carry white text over
           * ANY photograph an owner uploads — a dim reception or a white
           * marquee at noon — and a fixed dark band is the only version whose
           * contrast does not depend on the picture. Same lesson as the hero
           * badge.
           *
           * Not from the palette: `palette.background` is cream on this
           * template, and white on cream is unreadable. The band is dark for
           * every tenant precisely because the text on it is always white.
           */}
          <div
            style={{
              width: size.width,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "52px 72px 52px 72px",
              backgroundColor: "#121212",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: name.length > 26 ? 62 : 78,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.1,
              }}
            >
              {name || "Website"}
            </div>
            {place && (
              <div
                style={{
                  display: "flex",
                  marginTop: 16,
                  fontSize: 32,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {clip(place, 60)}
              </div>
            )}
          </div>

          {/* The brand rule, flush to the bottom edge. */}
          <div
            style={{
              display: "flex",
              width: size.width,
              height: 12,
              background: palette.accent,
            }}
          />
        </div>
      ),
      { ...size, fonts: fonts() },
    );
  }

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
