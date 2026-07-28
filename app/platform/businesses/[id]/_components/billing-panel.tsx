import {
  setBusinessPlan,
  setFeatureOverride,
} from "@/features/platform/billing";
import { FEATURE_KEYS, FEATURES } from "@/lib/features/catalogue";
import type { Entitlement, Plan } from "@/types/billing";

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
        <h2 className="font-heading text-lg tracking-[2px]">Plan & features</h2>
        <p className="mt-1 text-sm text-gray">
          {entitlement.subscription
            ? `Subscription status: ${entitlement.subscription.status}${
                entitlement.entitled ? "" : " — falling back to the default plan"
              }`
            : "No subscription — using the default plan."}
        </p>
      </div>

      <form
        action={setBusinessPlan}
        className="flex flex-wrap items-end gap-3 border border-dark-border bg-dark p-5"
      >
        <input type="hidden" name="businessId" value={businessId} />
        <label className="grid gap-1.5">
          <span className="text-[0.65rem] uppercase tracking-[1.5px] text-gray">
            Plan
          </span>
          <select
            name="planId"
            defaultValue={currentPlanId}
            className="h-auto rounded-none border border-dark-border bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-gold"
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
        <button
          type="submit"
          className="border border-gold px-4 py-2 text-xs uppercase tracking-[2px] text-gold transition-colors hover:bg-gold hover:text-black"
        >
          Set plan
        </button>
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
              className="flex flex-wrap items-center gap-3 border border-dark-border bg-dark px-4 py-3"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${effective ? "bg-[#6cbf84]" : "bg-dark-border"}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm text-white">{FEATURES[key].label}</p>
                <p className="text-xs text-gray">{FEATURES[key].description}</p>
              </div>

              <form
                action={setFeatureOverride}
                className="ml-auto flex items-center gap-2"
              >
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="featureKey" value={key} />
                <span className="text-[0.6rem] uppercase tracking-[1px] text-gray">
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
                  className="h-auto rounded-none border border-dark-border bg-charcoal px-2 py-1 text-xs text-white outline-none focus:border-gold"
                >
                  <option value="inherit">Follow plan</option>
                  <option value="on">Force on</option>
                  <option value="off">Force off</option>
                </select>
                <button
                  type="submit"
                  className="text-xs uppercase tracking-[1px] text-gray transition-colors hover:text-gold"
                >
                  Apply
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
