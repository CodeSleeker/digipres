/** Compact metric tile for the platform dashboard. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const valueTone =
    tone === "danger"
      ? "text-[#c1666b]"
      : tone === "warn"
        ? "text-[#d8b26a]"
        : "text-admin-fg";

  return (
    <div className="border border-admin-line bg-admin-panel p-5">
      <div className={`font-admin-heading text-3xl leading-none ${valueTone}`}>
        {value}
      </div>
      <div className="mt-2 text-[0.7rem] uppercase tracking-[1.5px] text-admin-fg/80">
        {label}
      </div>
      {hint && <p className="mt-1 text-xs text-admin-muted">{hint}</p>}
    </div>
  );
}
