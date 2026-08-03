import type { AuditEntry } from "@/types/platform";

/**
 * Actions are `noun.verb` strings written by the actions themselves. Anything
 * unmapped falls back to the raw code rather than being hidden, so a new action
 * is visible in the trail the day it ships.
 */
const LABEL: Record<string, string> = {
  "impersonation.started": "Started acting as client",
  "impersonation.ended": "Stopped acting as client",
  "business.onboarded": "Onboarded business",
  "business.suspended": "Suspended service",
  "business.reactivated": "Reactivated service",
  "business.deleted": "Removed business",
  "business.updated": "Edited business profile",
  "onboarding.step_saved": "Saved onboarding step",
  "billing.plan_changed": "Changed plan",
  "billing.override_set": "Set feature override",
  "appointment.created": "Created appointment",
  "appointment.updated": "Updated appointment",
  "appointment.deleted": "Deleted appointment",
  "customer.created": "Created customer",
  "customer.updated": "Updated customer",
  "customer.deleted": "Deleted customer",
  "domain.added": "Added domain",
  "domain.verified": "Verified domain",
  "domain.set_primary": "Set primary domain",
  "domain.removed": "Removed domain",
  "website.section_updated": "Edited website section",
  "reviews.processed_now": "Ran review processor",
};

/** Destructive or outward-facing actions read differently at a glance. */
const NOTABLE = new Set([
  "customer.deleted",
  "appointment.deleted",
  "domain.removed",
  "reviews.processed_now",
]);

export function AuditTable({ rows }: { rows: AuditEntry[] }) {
  if (rows.length === 0) {
    return (
      <p className="border border-dark-border p-6 text-sm text-gray">
        No staff activity recorded.
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto border border-dark-border">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="border-b border-dark-border text-[0.7rem] uppercase tracking-[1px] text-gray">
          <tr>
            <th className="p-3 font-normal">When</th>
            <th className="p-3 font-normal">Action</th>
            <th className="p-3 font-normal">Target</th>
            <th className="p-3 font-normal">Staff</th>
            <th className="p-3 font-normal">IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-dark-border/50">
              <td className="whitespace-nowrap p-3 text-gray-light">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td
                className={`p-3 ${NOTABLE.has(row.action) ? "text-gold" : "text-white"}`}
              >
                {LABEL[row.action] ?? row.action}
                {detailOf(row) && (
                  <span className="ml-2 text-xs text-gray">
                    {detailOf(row)}
                  </span>
                )}
              </td>
              <td className="p-3 text-gray-light">
                {row.entity ?? "—"}
                {row.entityId && (
                  <span className="ml-1 text-xs text-gray">
                    {row.entityId.slice(0, 8)}
                  </span>
                )}
              </td>
              <td className="p-3 text-gray-light">
                {row.actorUserId?.slice(0, 8) ?? "system"}
              </td>
              <td className="p-3 text-gray">{row.ip ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The one metadata field worth showing inline, per action. */
function detailOf(row: AuditEntry): string | null {
  const meta = row.metadata ?? {};
  if (typeof meta.section === "string") return meta.section;
  if (typeof meta.hostname === "string") return meta.hostname;
  if (typeof meta.businessName === "string") return meta.businessName;
  if (Array.isArray(meta.fields)) return meta.fields.join(", ");
  if (typeof meta.sent === "number") return `${meta.sent} sent`;
  return null;
}
