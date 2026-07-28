import Link from "next/link";
import { requirePlatformWriter } from "@/lib/auth/require-platform-admin";
import { OnboardForm } from "./_components/onboard-form";

/** Onboard a new client: create the business and invite its owner. */
export default async function OnboardBusinessPage() {
  // Read-only staff can't create tenants — bounced before the form renders.
  await requirePlatformWriter();

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/platform/businesses"
          className="text-xs text-gray transition-colors hover:text-gold"
        >
          ← All businesses
        </Link>
        <h1 className="mt-2 font-heading text-2xl tracking-[2px]">
          Onboard a business
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray">
          Creates the business, assigns a template and theme, and emails the
          owner an invitation to set their password. The business starts as a
          draft until they complete setup.
        </p>
      </div>

      <OnboardForm />
    </div>
  );
}
