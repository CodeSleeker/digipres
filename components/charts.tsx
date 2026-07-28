import type { ReactNode } from "react";
import type { TimePoint } from "@/types/analytics";

/** Brand palette (mirrors the @theme tokens) for chart fills. */
export const CHART = {
  gold: "#c9a96e",
  goldLight: "#e8d5a8",
  goldDark: "#8b7340",
  track: "#2a2a2a",
  gray: "#888888",
  success: "#6cbf84",
  warning: "#d8b26a",
  danger: "#c1666b",
  muted: "#4a4a4a",
} as const;

/** Consistent card shell for a single chart. */
export function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-dark-border bg-dark p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg tracking-[2px]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray">{subtitle}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-dark-border px-2 py-0.5 text-[0.6rem] uppercase tracking-[1px] text-gray">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Vertical bar chart (pure CSS bars). Value labels sit under each bar. */
export function BarChart({
  data,
  color = CHART.gold,
}: {
  data: TimePoint[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-stretch gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? "0.35rem" : "0",
                background: color,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="mt-2 text-[0.65rem] text-white">{d.value}</span>
          <span className="text-[0.6rem] uppercase tracking-[1px] text-gray">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Area + line chart. `id` must be unique per instance (gradient def). */
export function LineChart({
  data,
  id,
  color = CHART.gold,
  dashed = false,
}: {
  data: TimePoint[];
  id: string;
  color?: string;
  dashed?: boolean;
}) {
  const W = 100;
  const H = 100;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const pts = data.map((d, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * W;
    const y = H - (d.value / max) * H;
    return [x, y] as const;
  });
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${id})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? "4 3" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between">
        {data.map((d, i) => (
          <span
            key={i}
            className="text-[0.6rem] uppercase tracking-[1px] text-gray"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/** Donut chart with a centred value and a legend of segments. */
export function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const R = 15.915; // circumference ≈ 100 → dasharray reads as percentages
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full" role="img">
          <circle
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke={CHART.track}
            strokeWidth="4"
          />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s, i) => {
                const pct = (s.value / total) * 100;
                const dashoffset = 25 - cumulative;
                cumulative += pct;
                return (
                  <circle
                    key={i}
                    cx="21"
                    cy="21"
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="4"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeDashoffset={dashoffset}
                  />
                );
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl leading-none text-white">
            {centerValue}
          </span>
          <span className="mt-1 text-[0.6rem] uppercase tracking-[1px] text-gray">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="grid flex-1 gap-2 text-xs">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-gray-light">{s.label}</span>
            <span className="ml-auto text-white">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars for a star-rating distribution (5★ → 1★). */
export function StarBars({
  rows,
}: {
  rows: { stars: number; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.stars} className="flex items-center gap-3 text-xs">
          <span className="w-7 shrink-0 text-gray-light">{r.stars}★</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-dark-border">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: CHART.gold,
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-gray">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}
