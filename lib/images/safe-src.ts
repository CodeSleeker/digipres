/**
 * Which image sources may go through the Next.js image optimizer?
 *
 * `next/image` THROWS at render time for hosts missing from
 * `images.remotePatterns` — so an owner pasting an arbitrary image URL into the
 * CMS must not reach it. This list is the single source of truth: it must stay
 * in sync with `next.config.ts`, and everything else falls back to a plain,
 * lazy-loaded `<img>` (unoptimized but never a broken page).
 */

/** Hosts mirrored in next.config.ts `images.remotePatterns`. */
const ALLOWED_HOSTS = new Set(["images.unsplash.com"]);

const ALLOWED_SUFFIXES = [".supabase.co"]; // tenant uploads (Supabase Storage)

export function isOptimizableSrc(
  src: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!src) return false;

  // Local/public assets — always optimizable. ("//host/…" is protocol-relative,
  // i.e. remote, so it must not slip through this branch.)
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  if (ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  // The project's own Supabase host (covers self-hosted/custom domains).
  const supabase = env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabase) {
    try {
      if (new URL(supabase).hostname.toLowerCase() === host) return true;
    } catch {
      // malformed env — treat as not allowed
    }
  }
  return false;
}
