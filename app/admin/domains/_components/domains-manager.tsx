"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addDomain,
  removeDomain,
  setPrimaryDomain,
  verifyDomain,
  type DomainState,
} from "@/features/domains/actions";
import type { BusinessDomain } from "@/types/domain";
import type { DnsInstruction } from "@/lib/domains/provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/submit-button";

const fieldClass =
  "h-auto w-full rounded-none border border-dark-border bg-charcoal px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold";

/**
 * A per-row action link that shows its own progress.
 *
 * `disabled` locks every row action while ANY of them runs (they mutate the
 * same list), but only the clicked one gets the spinner — otherwise three
 * buttons animate at once and none of them means anything.
 */
function RowAction({
  children,
  pendingLabel,
  active,
  disabled,
  onClick,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 transition-colors disabled:opacity-50 ${className}`}
    >
      {active && <Spinner />}
      {active ? pendingLabel : children}
    </button>
  );
}

export function DomainsManager({
  domains,
  platformUrl,
}: {
  domains: BusinessDomain[];
  platformUrl: string | null;
}) {
  const [addState, addAction, adding] = useActionState<DomainState, FormData>(
    addDomain,
    {},
  );
  const [pending, start] = useTransition();
  const [rowState, setRowState] = useState<Record<string, DomainState>>({});
  /**
   * WHICH row action is running, not just whether one is.
   *
   * `useTransition`'s flag is a single boolean, so with it alone all three
   * buttons on every row dim together and nothing says which one was clicked.
   * Verifying DNS can take seconds — long enough to wonder if the click landed.
   */
  const [running, setRunning] = useState<string | null>(null);

  function run(
    action: (formData: FormData) => Promise<DomainState>,
    id: string,
    label: string,
  ) {
    const formData = new FormData();
    formData.set("id", id);
    setRunning(`${id}:${label}`);
    start(async () => {
      const result = await action(formData);
      setRowState((s) => ({ ...s, [id]: result }));
      setRunning(null);
    });
  }

  return (
    <div className="grid gap-8">
      {/* Add a domain */}
      <section className="border border-dark-border bg-dark p-5">
        <h2 className="font-heading text-lg tracking-[2px]">
          Connect a domain
        </h2>
        <p className="mt-1 text-sm text-gray">
          Add your apex domain and, if you use it, the <code>www</code> version —
          both point at the same site.
        </p>

        <form action={addAction} className="mt-4 flex flex-wrap gap-3">
          <input
            name="hostname"
            placeholder="roniesbarber.com"
            required
            className={`${fieldClass} max-w-xs flex-1`}
          />
          <Button
            type="submit"
            disabled={adding}
            className="rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
          >
            {adding ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                ADDING…
              </span>
            ) : (
              "ADD DOMAIN"
            )}
          </Button>
        </form>

        {addState.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {addState.error}
          </p>
        )}
        {addState.notice && (
          <p className="mt-3 text-sm text-[#d8b26a]">{addState.notice}</p>
        )}
        {addState.instructions && addState.instructions.length > 0 && (
          <DnsRecords instructions={addState.instructions} />
        )}
      </section>

      {/* Existing domains */}
      <section className="grid gap-3">
        <h2 className="font-heading text-lg tracking-[2px]">Your domains</h2>

        {domains.length === 0 ? (
          <p className="border border-dark-border bg-dark p-5 text-sm text-gray">
            No custom domains yet.
            {platformUrl && (
              <>
                {" "}
                Your site is live at{" "}
                <span className="text-gold">{platformUrl}</span>.
              </>
            )}
          </p>
        ) : (
          <ul className="grid gap-3">
            {domains.map((domain) => {
              const state = rowState[domain.id];
              return (
                <li
                  key={domain.id}
                  className="border border-dark-border bg-dark p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white">
                        {domain.hostname}
                      </span>
                      {domain.isPrimary && <Badge tone="gold">Primary</Badge>}
                      {domain.verified ? (
                        <Badge tone="green">Verified</Badge>
                      ) : (
                        <Badge tone="amber">Pending DNS</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {!domain.verified && (
                        <RowAction
                          active={running === `${domain.id}:verify`}
                          disabled={pending}
                          onClick={() =>
                            run(verifyDomain, domain.id, "verify")
                          }
                          pendingLabel="Verifying…"
                          className="text-gold hover:text-gold-light"
                        >
                          Verify
                        </RowAction>
                      )}
                      {domain.verified && !domain.isPrimary && (
                        <RowAction
                          active={running === `${domain.id}:primary`}
                          disabled={pending}
                          onClick={() =>
                            run(setPrimaryDomain, domain.id, "primary")
                          }
                          pendingLabel="Updating…"
                          className="text-gray hover:text-gold"
                        >
                          Make primary
                        </RowAction>
                      )}
                      <RowAction
                        active={running === `${domain.id}:remove`}
                        disabled={pending}
                        onClick={() => run(removeDomain, domain.id, "remove")}
                        pendingLabel="Removing…"
                        className="text-gray hover:text-destructive"
                      >
                        Remove
                      </RowAction>
                    </div>
                  </div>

                  {state?.error && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      {state.error}
                    </p>
                  )}
                  {state?.verified && (
                    <p className="mt-3 text-sm text-[#6cbf84]">
                      Verified — this domain is now serving your site.
                    </p>
                  )}
                  {state?.instructions && state.instructions.length > 0 && (
                    <DnsRecords instructions={state.instructions} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function DnsRecords({ instructions }: { instructions: DnsInstruction[] }) {
  return (
    <div className="mt-4 overflow-x-auto border border-dark-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-charcoal text-gray">
          <tr>
            <th className="px-3 py-2 font-normal">Type</th>
            <th className="px-3 py-2 font-normal">Name</th>
            <th className="px-3 py-2 font-normal">Value</th>
          </tr>
        </thead>
        <tbody className="text-gray-light">
          {instructions.map((record, i) => (
            <tr key={i} className="border-t border-dark-border">
              <td className="px-3 py-2">{record.type}</td>
              <td className="break-all px-3 py-2 font-mono">{record.name}</td>
              <td className="break-all px-3 py-2 font-mono">{record.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "gold" | "green" | "amber";
  children: React.ReactNode;
}) {
  const tones = {
    gold: "border-gold/40 text-gold",
    green: "border-[#6cbf84]/40 text-[#6cbf84]",
    amber: "border-[#d8b26a]/40 text-[#d8b26a]",
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-[1px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
