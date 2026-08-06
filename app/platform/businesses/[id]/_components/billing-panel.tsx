import {
  setBusinessPlan,
  setFeatureOverride,
} from "@/features/platform/billing";
import { FEATURE_KEYS, FEATURES } from "@/lib/features/catalogue";
import type { Entitlement, Plan } from "@/types/billing";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Plan assignment + per-feature overrides for one tenant.
 *
 * Each row shows what the feature currently resolves to and lets staff pin it
 * on/off or hand it back to the plan ("inherit"), which is how support grants a
 * single capability without inventing a plan.
 */
export function BillingPanel({
  businessId,
  plans,
  entitlement,
  overrides,
}: {
  businessId: string;
  plans: Plan[];
  entitlement: Entitlement;
  overrides: Record<string, boolean>;
}) {
  const currentPlanId = entitlement.plan?.id ?? "";

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-admin-heading text-lg tracking-[2px]">Plan & features</h2>
        <p className="mt-1 text-sm text-admin-muted">
          {entitlement.subscription
            ? `Subscription status: ${entitlement.subscription.status}${
                entitlement.entitled ? "" : " — falling back to the default plan"
              }`
            : "No subscription — using the default plan."}
        </p>
      </div>

      <form
        action={setBusinessPlan}
        className="flex flex-wrap items-end gap-3 border border-admin-line bg-admin-panel p-5"
      >
        <input type="hidden" name="businessId" value={businessId} />
        <label className="grid gap-1.5">
          <span className="text-[0.65rem] uppercase tracking-[1.5px] text-admin-muted">
            Plan
          </span>
          <select
            name="planId"
            defaultValue={currentPlanId}
            className="h-auto rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none focus:border-admin-accent"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.priceCents === 0
                  ? "Free"
                  : `${(p.priceCents / 100).toFixed(2)}/${p.interval}`}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton
          pendingLabel="Saving…"
          className="border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
        >
          Set plan
        </SubmitButton>
      </form>

      <ul className="grid gap-2">
        {FEATURE_KEYS.map((key) => {
          const effective = entitlement.features[key];
          const override = overrides[key];
          const source =
            typeof override === "boolean" ? "override" : "plan";

          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-3 border border-admin-line bg-admin-panel px-4 py-3"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${effective ? "bg-[#6cbf84]" : "bg-admin-line"}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm text-admin-fg">{FEATURES[key].label}</p>
                <p className="text-xs text-admin-muted">{FEATURES[key].description}</p>
              </div>

              <form
                action={setFeatureOverride}
                className="ml-auto flex items-center gap-2"
              >
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="featureKey" value={key} />
                <span className="text-[0.6rem] uppercase tracking-[1px] text-admin-muted">
                  via {source}
                </span>
                <select
                  name="value"
                  defaultValue={
                    typeof override === "boolean"
                      ? override
                        ? "on"
                        : "off"
                      : "inherit"
                  }
                  className="h-auto rounded-none border border-admin-line bg-admin-field px-2 py-1 text-xs text-admin-fg outline-none focus:border-admin-accent"
                >
                  <option value="inherit">Follow plan</option>
                  <option value="on">Force on</option>
                  <option value="off">Force off</option>
                </select>
                <SubmitButton
                  pendingLabel="Applying…"
                  className="text-xs uppercase tracking-[1px] text-admin-muted transition-colors hover:text-admin-accent"
                >
                  Apply
                </SubmitButton>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
