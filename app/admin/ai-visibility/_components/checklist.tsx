import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type VisibilityCheck,
} from "@/types/ai-visibility";
import { STATUS_META } from "./readiness";

/** The recommendations checklist, grouped by category. */
export function Checklist({ checks }: { checks: VisibilityCheck[] }) {
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: checks.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="grid gap-6">
      {byCategory.map(({ cat, items }) => (
        <section key={cat}>
          <h3 className="mb-3 text-[0.7rem] uppercase tracking-[2px] text-admin-muted">
            {CATEGORY_LABEL[cat]}
          </h3>
          <ul className="grid gap-3">
            {items.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CheckRow({ check }: { check: VisibilityCheck }) {
  const meta = STATUS_META[check.status];
  return (
    <li className="border border-admin-line bg-admin-panel p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: meta.dot }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-admin-heading text-base tracking-[1px]">
              {check.label}
            </h4>
            <span
              className={`shrink-0 text-[0.65rem] uppercase tracking-[1.5px] ${meta.text}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-admin-fg/80">{check.finding}</p>
          <p className="mt-2 flex gap-2 text-sm text-admin-muted">
            <span className="shrink-0 text-admin-accent">→</span>
            <span>{check.recommendation}</span>
          </p>
        </div>
      </div>
    </li>
  );
}
