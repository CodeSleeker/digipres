import { type NextRequest } from "next/server";
import { iconInitial } from "@/lib/tenant/icons";

/**
 * A browser-tab icon generated from a business's initial — the last link in the
 * chain in lib/tenant/icons.ts, used when a tenant has uploaded neither a
 * favicon nor a logo.
 *
 * SVG rather than a rasteriser: no image dependency at runtime, one small
 * response that stays crisp at every tab and bookmark size, and the letter is
 * drawn by the browser's own font stack.
 *
 * Public and unauthenticated by design — it renders nothing that isn't already
 * on the public page, and it must be reachable from tenant domains (the
 * middleware matcher excludes `/api`, so it is).
 */
export function GET(request: NextRequest) {
  const initial = iconInitial(
    request.nextUrl.searchParams.get("initial") ?? "",
  );

  // `dominant-baseline` is honoured inconsistently in favicon rendering
  // contexts, so the baseline is positioned arithmetically instead.
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#0a0a0a"/>
  <text x="32" y="45" fill="#c9a96e" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700" font-size="${initial.length > 1 ? 30 : 40}">${initial}</text>
</svg>`;

  return new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Content-addressed by the `initial` query, so a change of name produces
      // a different URL rather than a stale cache entry.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
