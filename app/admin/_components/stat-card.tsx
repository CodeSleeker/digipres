import Link from "next/link";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  /** When set, the whole card links here and highlights on hover. */
  href?: string;
  /** 0–100; renders a progress bar under the value. */
  progress?: number;
  /** Placeholder styling for metrics that aren't wired up yet. */
  muted?: boolean;
}

/**
 * Modern metric card for the admin dashboard: an icon badge, a large value, a
 * label, and an optional hint. Becomes a link (with a gold hover border) when
 * `href` is set; `muted` dims it for not-yet-available analytics.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  progress,
  muted,
}: StatCardProps) {
  const body = (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            muted
              ? "bg-admin-line text-admin-muted"
              : "bg-admin-accent/10 text-admin-accent"
          }`}
        >
          {icon}
        </span>
        {href && !muted && (
          <span className="text-admin-muted transition-colors group-hover:text-admin-accent">
            <ArrowIcon />
          </span>
        )}
      </div>

      <div className="mt-auto">
        <div
          className={`font-admin-heading text-3xl leading-none tracking-[1px] ${
            muted ? "text-admin-muted" : "text-admin-fg"
          }`}
        >
          {value}
        </div>
        <div className="mt-2 text-[0.7rem] uppercase tracking-[1.5px] text-admin-fg/80">
          {label}
        </div>
      </div>

      {typeof progress === "number" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-admin-line">
          <div
            className="h-full rounded-full bg-admin-accent transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {hint && <p className="text-xs text-admin-muted">{hint}</p>}
    </div>
  );

  const shell = "border border-admin-line bg-admin-panel p-5";

  if (href) {
    return (
      <Link
        href={href}
        className={`group block ${shell} transition-colors hover:border-admin-accent`}
      >
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

/* --- Inline icons (stroke, currentColor) --------------------------------- */

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CalendarIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function ReviewIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 5-6" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg {...iconProps} width={16} height={16} aria-hidden="true">
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  );
}
