import {
  Award,
  Calendar,
  Camera,
  Clock,
  Crown,
  Flower2,
  Gift,
  Heart,
  Lightbulb,
  Mail,
  MapPin,
  Music,
  Palette,
  PartyPopper,
  Phone,
  Sparkles,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/**
 * The mockup's icons, resolved from the profile's icon NAMES.
 *
 * The source loaded the whole Lucide set from a CDN and swapped
 * `<i data-lucide="heart">` placeholders at runtime. Importing the handful the
 * template actually uses ships a few hundred bytes of SVG instead of a
 * third-party script, and removes a render pass in which every icon is
 * momentarily absent.
 *
 * The map is deliberately closed: `Service.icon` is a free string an owner can
 * edit, so an unknown value must land somewhere rather than crash a page.
 */
const ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  sparkles: Sparkles,
  palette: Palette,
  crown: Crown,
  award: Award,
  calendar: Calendar,
  camera: Camera,
  clock: Clock,
  flower: Flower2,
  gift: Gift,
  lightbulb: Lightbulb,
  mail: Mail,
  "map-pin": MapPin,
  music: Music,
  party: PartyPopper,
  phone: Phone,
  users: Users,
  utensils: Utensils,
};

/**
 * An icon by name, defaulting to the sparkle.
 *
 * `aria-hidden` throughout: every icon here sits inside a control or beside a
 * line of text that already carries the meaning, so announcing it would only
 * add noise. An icon that ever stands alone needs a label, not a removed
 * `aria-hidden`.
 */
export function ServiceIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name.trim().toLowerCase()] ?? Sparkles;
  return <Icon aria-hidden="true" className={className} />;
}

/**
 * Social glyphs, drawn here.
 *
 * lucide-react dropped its brand marks at v1, so these are hand-drawn the
 * same way the patisserie template draws its own — `currentColor`
 * throughout, sized by the caller, and `aria-hidden` because the link around
 * each one already carries its accessible name.
 */
type Glyph = (props: { className?: string }) => React.ReactElement;

const Instagram: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="5"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
  </svg>
);

const Facebook: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="M15 21v-7.9h2.7l.4-3.1H15V8c0-.9.3-1.5 1.6-1.5h1.7V3.7A22 22 0 0 0 15.8 3.6c-2.5 0-4.2 1.5-4.2 4.3v2.1H8.9V13h2.7V21z"
      fill="currentColor"
    />
  </svg>
);

const Twitter: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="M17.2 3h3.3l-7.2 8.2L21.8 21h-6.6l-5.2-6.5L4.2 21H.9l7.7-8.8L.4 3H7l4.7 5.9zm-1.2 16h1.8L6.1 4.8H4.1z"
      fill="currentColor"
    />
  </svg>
);

const Linkedin: Glyph = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="M4.6 3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8M3 8.4h3.2V21H3zM9.3 8.4h3.1v1.7h.1a3.4 3.4 0 0 1 3-1.7c3.3 0 3.9 2.1 3.9 4.9V21h-3.2v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H9.3z"
      fill="currentColor"
    />
  </svg>
);

/** Keyed by the profile's platform labels. */
const SOCIALS: Record<string, Glyph> = {
  instagram: Instagram,
  ig: Instagram,
  facebook: Facebook,
  fb: Facebook,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
};

export function SocialIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = SOCIALS[name.trim().toLowerCase()] ?? Instagram;
  return <Icon className={className} />;
}

/**
 * Contact-detail glyphs.
 *
 * Keyed by the EMOJI the shared contract carries: `ContactDetail.icon` is a
 * glyph in `BusinessProfile` — the barber template prints it directly — and
 * `buildContactDetails` derives a real tenant's cards with those same glyphs
 * from their own columns. This design draws line art, so the emoji is a key
 * rather than content.
 *
 * The plain names beside them are for a template default written by hand,
 * which reads better than a column of emoji in a data file. An unrecognised
 * value falls back to the pin rather than leaving a hole in the row.
 */
const DETAILS: Record<string, LucideIcon> = {
  "\u{1F4CD}": MapPin,
  "\u{1F550}": Clock,
  "\u{1F4F1}": Phone,
  "\u2709": Mail,
  "map-pin": MapPin,
  location: MapPin,
  clock: Clock,
  hours: Clock,
  mail: Mail,
  email: Mail,
  phone: Phone,
};

export function DetailIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = DETAILS[name.trim().toLowerCase()] ?? MapPin;
  return <Icon aria-hidden="true" className={className} />;
}
