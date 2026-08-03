"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { LeadRepository } from "@/repositories/lead-repository";
import { leadSchema, type NewLead } from "@/schemas/lead";
import { notifyNewLead } from "@/lib/notifications/lead-notice";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/observability/logger";

/**
 * The marketing site's enquiry and consultation forms.
 *
 * NO CLIENT JAVASCRIPT. Feedback is a redirect back to the section with a query
 * flag, which the page renders server-side. The landing page is otherwise a
 * pure server render, and a marketing form is exactly the thing that should
 * still work when a script fails to load — this one is a plain HTML POST.
 *
 * WHY SERVICE-ROLE: `leads` has no INSERT policy (migration 0029). The only way
 * in is through here, so the rate limit, the honeypot and the schema cannot be
 * sidestepped by posting at the database directly.
 */

/** Where the form lives on the page, so the redirect lands back on it. */
const ANCHOR: Record<string, string> = {
  consultation: "booking",
  contact: "contact",
};

/**
 * `form` is in the QUERY, not just the fragment.
 *
 * The fragment scrolls the browser to the right section but is never sent to
 * the server, so it cannot be used to decide which section renders the notice.
 * Without the query param both forms would report the same submission.
 */
function back(kind: string, status: string): never {
  const anchor = ANCHOR[kind] ?? "contact";
  const form = kind === "consultation" ? "consultation" : "contact";
  redirect(`/?sent=${status}&form=${form}#${anchor}`);
}

export async function submitLead(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "contact");

  const parsed = leadSchema.safeParse({
    kind,
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    projectType: formData.get("projectType"),
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime"),
    message: formData.get("message"),
    company: formData.get("company"),
  });

  if (!parsed.success) back(kind, "invalid");

  /*
   * Honeypot: report SUCCESS and do nothing.
   *
   * Telling a bot it was rejected is how its author learns which field to stop
   * filling in. A person never sees this branch — the input is hidden and out
   * of the tab order.
   */
  if (parsed.data.company && parsed.data.company.trim() !== "") {
    back(kind, "ok");
  }

  const ip = ipFromHeaders(await headers());
  // Generous enough for a real person who mistypes their email twice, tight
  // enough that the inbox cannot be flooded from one address.
  if (!rateLimit(`lead:${ip}`, 5, 60 * 60 * 1000).ok) {
    back(kind, "throttled");
  }

  const lead: NewLead = {
    kind: parsed.data.kind,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    projectType: parsed.data.projectType ?? null,
    preferredDate: parsed.data.preferredDate ?? null,
    preferredTime: parsed.data.preferredTime ?? null,
    message: parsed.data.message ?? null,
    sourceIp: ip,
  };

  // The row first, and only the row is allowed to fail the request. Alerts are
  // best-effort: once it is stored, the enquiry is not lost, so a mail or
  // carrier outage must not tell a stranger their message failed.
  try {
    await new LeadRepository(createServiceClient()).insert(lead);
  } catch (error) {
    logError(error, { scope: "marketing:submitLead" });
    back(kind, "error");
  }

  const alerts = await notifyNewLead(lead);
  // Surfaced in logs only: the visitor's outcome does not depend on it, but a
  // silently dead alert channel is exactly what this needs to make visible.
  if (alerts.email !== "sent" || alerts.sms !== "sent") {
    console.warn(
      "[lead] stored but alerts incomplete — email=%s sms=%s",
      alerts.email,
      alerts.sms,
    );
  }

  back(kind, "ok");
}
