import type { CheckStatus, VisibilityReport } from "@/types/ai-visibility";

const RING = {
  gold: "#c9a96e",
  track: "#2a2a2a",
} as const;

const STATUS_META: Record<
  CheckStatus,
  { label: string; dot: string; text: string }
> = {
  pass: { label: "Pass", dot: "#6cbf84", text: "text-[#6cbf84]" },
  warn: { label: "Improve", dot: "#d8b26a", text: "text-[#d8b26a]" },
  fail: { label: "Action", dot: "#c1666b", text: "text-[#c1666b]" },
  info: { label: "Review", dot: "#888888", text: "text-admin-muted" },
};

/** The headline AI Readiness Score: a ring, grade, and status tallies. */
export function ReadinessScore({ report }: { report: VisibilityReport }) {
  const { score } = report;
  const R = 15.915;
  const dash = `${score} ${100 - score}`;

  return (
    <div className="grid gap-6 border border-admin-line bg-admin-panel p-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="relative mx-auto h-40 w-40">
        <svg viewBox="0 0 42 42" className="h-full w-full" role="img">
          <circle
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke={RING.track}
            strokeWidth="3.5"
          />
          <circle
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke={RING.gold}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset="25"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-admin-heading text-4xl leading-none text-admin-fg">
            {score}
          </span>
          <span className="text-[0.6rem] uppercase tracking-[2px] text-admin-muted">
            / 100
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[2px] text-admin-accent">
          AI Readiness Score
        </p>
        <h2 className="mt-1 font-admin-heading text-2xl tracking-[1px]">
          Grade {report.grade} · {report.gradeLabel}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-admin-muted">
          A weighted view of how machine-readable and discoverable this site is
          for search engines and AI assistants. These are optimization
          recommendations — not a guarantee of any AI or search ranking.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <Tally color={STATUS_META.pass.dot} label="Pass" n={report.passCount} />
          <Tally
            color={STATUS_META.warn.dot}
            label="Improve"
            n={report.warnCount}
          />
          <Tally
            color={STATUS_META.fail.dot}
            label="Action"
            n={report.failCount}
          />
          <Tally
            color={STATUS_META.info.dot}
            label="Review"
            n={report.infoCount}
          />
        </div>
      </div>
    </div>
  );
}

function Tally({
  color,
  label,
  n,
}: {
  color: string;
  label: string;
  n: number;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-admin-fg">{n}</span>
      <span className="text-admin-muted">{label}</span>
    </span>
  );
}

export { STATUS_META };
