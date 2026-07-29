import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Content-Security-Policy tuned to this app:
 *  - 'unsafe-inline' for script/style is required by Next's hydration bootstrap
 *    and the templates' inline `style` attributes. A nonce-based CSP is a
 *    future upgrade.
 *  - 'unsafe-eval' is granted in `next dev` ONLY: React's dev runtime needs
 *    eval() for debugging features (it never uses eval in production builds).
 *    Keyed off the config PHASE, not NODE_ENV — this machine exports a global
 *    NODE_ENV=staging, which makes NODE_ENV checks unreliable.
 *  - img-src allows remote CDN images (the plain-<img> fallback in
 *    components/ui/tenant-image.tsx loads them directly) and data URIs.
 *  - connect-src allows the Supabase API/realtime host.
 * If you move Supabase to a custom domain, add it to connect-src.
 */
function csp(isDev: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' https: data: blob:",
    // The hero scroll-scrub <video> is served from Supabase Storage or a
    // client-supplied URL. Without an explicit media-src this falls back to
    // `default-src 'self'` and the video is blocked outright — silently, since
    // a blocked media load looks identical to a missing file.
    "media-src 'self' https: data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "upgrade-insecure-requests",
  ].join("; ");
}

function securityHeaders(isDev: boolean) {
  return [
    { key: "Content-Security-Policy", value: csp(isDev) },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    // Remote hosts the image optimizer may fetch. Must stay in sync with the
    // allow-list in lib/images/safe-src.ts — hosts outside it render as plain
    // <img> (see components/ui/tenant-image.tsx), so a CMS-entered URL from an
    // unknown host degrades gracefully instead of throwing.
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "images.unsplash.com" },
        { protocol: "https", hostname: "**.supabase.co" },
      ],
    },
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders(isDev) }];
    },
  };
};

export default nextConfig;
