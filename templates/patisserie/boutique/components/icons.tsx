/**
 * The mockup's inline SVGs.
 *
 * All are `aria-hidden`: every one sits inside a control or a line of text that
 * already carries the meaning, so announcing them would only add noise. Any icon
 * that ever stands alone needs a `<title>` instead, not a removed `aria-hidden`.
 */

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2 7h10M8 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M10 3L5 8l5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Plus({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 3v9M3 7.5h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Clock() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7.5 4.4v3.4l2.1 1.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function QuestionMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.4 7.4a2.6 2.6 0 115 .9c0 1.7-2.6 2.2-2.6 2.2M10 14.2h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function Heart() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="inline-block align-[-1px] text-warm"
    >
      <path
        d="M6 10.4S1.3 7.6 1.3 4.5A2.4 2.4 0 016 3.2a2.4 2.4 0 014.7 1.3c0 3.1-4.7 5.9-4.7 5.9z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Close() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path
        d="M4 4l9 9M13 4l-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CaretLeft() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path
        d="M11 3.5l-5.5 5 5.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CaretRight() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path
        d="M6 3.5l5.5 5-5.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The contact card's detail icons.
 *
 * Keyed by the leading glyph the profile carries, because `ContactDetail.icon`
 * is an emoji in the shared contract (the barber template renders it directly)
 * and this design draws line art instead. An unrecognised glyph falls back to
 * the pin rather than leaving a hole in the row.
 */
export function DetailIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "🕐":
      return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="6.8" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M8.5 4.6v4l2.6 1.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "📱":
      return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <path
            d="M3.4 5.1a1.7 1.7 0 011.7-1.7h1.2l1.1 2.8-1.4 1a8 8 0 003.8 3.8l1-1.4 2.8 1.1v1.2a1.7 1.7 0 01-1.7 1.7A10.2 10.2 0 013.4 5.1z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "✉":
      return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <rect
            x="2.2"
            y="3.9"
            width="12.6"
            height="9.2"
            rx="1.6"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M2.6 5l5.9 4 5.9-4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <path
            d="M8.5 15.5s5.5-4.3 5.5-8a5.5 5.5 0 10-11 0c0 3.7 5.5 8 5.5 8z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="8.5" cy="7.4" r="1.9" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
  }
}

/**
 * Footer/contact social glyphs, keyed by the two-letter monogram the platform
 * derives (lib/website/build-profile.ts). Unknown platforms fall back to the
 * monogram itself, so a new network still renders a labelled control.
 */
export function SocialIcon({ label }: { label: string }) {
  switch (label.toUpperCase()) {
    case "IG":
      return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <rect
            x="2.4"
            y="2.4"
            width="12.2"
            height="12.2"
            rx="3.6"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <circle cx="8.5" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="12.1" cy="4.9" r=".9" fill="currentColor" />
        </svg>
      );
    case "FB":
      return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <path
            d="M10.6 15V9.4h1.9l.3-2.2h-2.2V5.8c0-.6.2-1.1 1.1-1.1h1.2V2.7A15 15 0 0011.1 2.6c-1.8 0-3 1.1-3 3.1v1.5H6.2v2.2h1.9V15z"
            fill="currentColor"
          />
        </svg>
      );
    case "TK":
      return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <path
            d="M10.9 2.5c.3 1.6 1.2 2.6 2.8 2.7v1.9c-.9.1-1.7-.2-2.6-.7v3.9c0 3.7-4 4.9-5.7 2.2-1-1.7-.4-4.7 3-4.8v2c-.3 0-.5.1-.8.2-.8.3-1.2 1-1 1.7.2 1.4 2.7 1.8 2.5-.9V2.5z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return (
        <span aria-hidden="true" className="text-[0.7rem] font-semibold">
          {label}
        </span>
      );
  }
}
