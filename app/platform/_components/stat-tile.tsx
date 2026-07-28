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
        : "text-white";

  return (
    <div className="border border-dark-border bg-dark p-5">
      <div className={`font-heading text-3xl leading-none ${valueTone}`}>
        {value}
      </div>
      <div className="mt-2 text-[0.7rem] uppercase tracking-[1.5px] text-gray-light">
        {label}
      </div>
      {hint && <p className="mt-1 text-xs text-gray">{hint}</p>}
    </div>
  );
}
