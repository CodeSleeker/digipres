/**
 * Validation for owner-supplied media (the hero scroll-scrub source, and the
 * photos uploaded throughout the CMS).
 *
 * VIDEO urls:
 *
 * These land in a `<video src>` rather than a CSS `url(...)`, so the rules
 * differ from lib/security/css: no CSS-escaping concerns, but the scheme must
 * be safe and the container must be one browsers can actually sample frames
 * from. Anything else is rejected at the CMS boundary rather than failing
 * silently on a client's live site.
 */

const ALLOWED_EXTENSIONS = [".mp4", ".webm"];

/** https:// or a root-relative path, pointing at an mp4/webm. */
export function isSafeVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const value = url.trim();
  if (!value || /\s/.test(value)) return false;

  // Root-relative (e.g. the template's own /templates/... asset).
  if (value.startsWith("/") && !value.startsWith("//")) {
    return hasAllowedExtension(value);
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  // https only — an http video on an https page is blocked as mixed content.
  if (parsed.protocol !== "https:") return false;
  return hasAllowedExtension(parsed.pathname);
}

function hasAllowedExtension(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * Storage object key for a tenant's hero video.
 *
 * The FIRST path segment is the business id — migration 0019's RLS policies key
 * on exactly that, so an owner can only write under their own folder. Changing
 * this shape without changing the policy would break uploads.
 */
export function heroVideoObjectKey(
  businessId: string,
  fileName: string,
): string {
  const extension = fileName.toLowerCase().endsWith(".webm") ? "webm" : "mp4";
  // Fixed name: re-uploading replaces the previous video instead of
  // accumulating orphaned objects nobody can see or clean up.
  return `${businessId}/hero/scrub.${extension}`;
}

/** Upload guardrails, enforced client-side before the bytes ever leave. */
export const MAX_HERO_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];

export function videoUploadError(file: {
  type: string;
  size: number;
}): string | null {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return "Choose an MP4 or WebM video.";
  }
  if (file.size > MAX_HERO_VIDEO_BYTES) {
    const mb = Math.round(MAX_HERO_VIDEO_BYTES / 1024 / 1024);
    return `That file is too large — keep it under ${mb}MB.`;
  }
  return null;
}

// ── Images ──────────────────────────────────────────────────────────────────

/**
 * Containers the browser can decode AND the Next.js optimizer can process.
 * Deliberately excludes SVG: an SVG can carry script, and it would be served
 * from the same origin family as the tenant's own site.
 */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/** Roughly a modern phone photo at full resolution. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function imageUploadError(file: {
  type: string;
  size: number;
}): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Choose a JPG, PNG, WebP or AVIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = Math.round(MAX_IMAGE_BYTES / 1024 / 1024);
    return `That photo is too large — keep it under ${mb}MB.`;
  }
  return null;
}

/**
 * Storage object key for one uploaded photo.
 *
 * As with the hero video, the FIRST path segment is the business id because
 * migration 0019's RLS keys on exactly that — an owner can only write beneath
 * their own folder, whatever the rest of the key says.
 *
 * Unlike the hero video, the name is UNIQUE rather than fixed. A gallery holds
 * many photos and they get reordered and removed, so there is no stable slot to
 * overwrite; a per-upload id also means a replaced photo never has to fight a
 * CDN-cached copy of the old one. The trade-off is that replacing a photo
 * leaves the previous object behind — see docs/operations.md.
 *
 * The extension comes from the CONTENT TYPE, not the supplied filename, so a
 * file called `cut.jpg.exe` cannot dictate the stored key.
 */
export function tenantImageObjectKey(
  businessId: string,
  contentType: string,
  uniqueId: string,
): string {
  const extension = IMAGE_EXTENSION[contentType] ?? "jpg";
  return `${businessId}/images/${uniqueId}.${extension}`;
}
